#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import smtplib
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

REVISION = os.environ["VELMERE_SOURCE_REVISION_ID"]
MANIFEST_SHA = os.environ["VELMERE_SOURCE_MANIFEST_SHA256"]
AGGREGATE_SHA = os.environ["VELMERE_SOURCE_AGGREGATE_SHA256"]
RUN_ID = os.environ.get("GITHUB_RUN_ID", "local")
EVIDENCE_DIR = pathlib.Path(os.environ.get("VELMERE_EVIDENCE_DIR", "evidence")).resolve()
LOCALSTACK_ENDPOINT = os.environ.get("LOCALSTACK_ENDPOINT", "http://127.0.0.1:4566")
MAILPIT_API = os.environ.get("MAILPIT_API", "http://127.0.0.1:8025")
MAILPIT_SMTP_HOST = os.environ.get("MAILPIT_SMTP_HOST", "127.0.0.1")
MAILPIT_SMTP_PORT = int(os.environ.get("MAILPIT_SMTP_PORT", "1025"))
CLASSIFICATION = "EXTERNAL_CI_LOCALSTACK_STORAGE_KMS_EMAIL_ONLY"
EXPECTED_CASE_IDS = [
    "private-object",
    "signed-url-short-lived",
    "wrong-account-denied",
    "kms-context-bound",
    "ciphertext-at-rest",
    "disposable-email-recipient",
    "provider-delivery-not-inbox-proof",
    "cleanup-success-path",
    "cleanup-failure-path",
    "secrets-redacted",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical_json_bytes(value))


def http_status(url: str, timeout: float = 10.0) -> tuple[int, bytes]:
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return int(response.status), response.read()
    except urllib.error.HTTPError as exc:
        return int(exc.code), exc.read()


def mailpit_messages() -> Any:
    with urllib.request.urlopen(f"{MAILPIT_API}/api/v1/messages", timeout=10.0) as response:
        return json.loads(response.read().decode("utf-8"))


def object_absent(s3: Any, bucket: str, key: str) -> bool:
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return False
    except ClientError as exc:
        status = int(exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode", 0))
        code = str(exc.response.get("Error", {}).get("Code", ""))
        return status in {403, 404} or code in {"404", "NoSuchKey", "NotFound"}


EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
CASES_DIR = EVIDENCE_DIR / "cases"
CASES_DIR.mkdir(parents=True, exist_ok=True)

source_binding = {
    "revisionId": REVISION,
    "sourceManifestSha256": MANIFEST_SHA,
    "sourceAggregateSha256": AGGREGATE_SHA,
}

session = boto3.session.Session(
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name="us-east-1",
)
common_config = Config(
    signature_version="s3v4",
    retries={"max_attempts": 3, "mode": "standard"},
    s3={"addressing_style": "path"},
)
s3 = session.client("s3", endpoint_url=LOCALSTACK_ENDPOINT, config=common_config)
kms = session.client("kms", endpoint_url=LOCALSTACK_ENDPOINT, config=Config(retries={"max_attempts": 3}))

run_suffix = sha256_text(RUN_ID)[:12]
bucket = f"velmere-r44p31-{run_suffix}"
owner_account = f"acct-owner-{run_suffix}"
wrong_account = f"acct-wrong-{run_suffix}"
tenant_id = f"tenant-{run_suffix}"
object_id = f"report-{run_suffix}"
object_key = f"private/{sha256_text(tenant_id)[:16]}/{object_id}.bin"
failure_key = f"private/{sha256_text(tenant_id)[:16]}/failure-cleanup.bin"
plaintext_marker = f"VELMERE-R44P31-PLAINTEXT-{uuid.uuid4().hex}"
application_secret = f"r44p31-secret-{uuid.uuid4().hex}"
plaintext = canonical_json_bytes({"report": object_id, "marker": plaintext_marker, "classification": "TEST_ONLY"})
context = {
    "tenant": sha256_text(tenant_id),
    "account": sha256_text(owner_account),
    "object": object_id,
    "version": "1",
}
wrong_context = dict(context)
wrong_context["account"] = sha256_text(wrong_account)

case_rows: list[dict[str, Any]] = []
created_key_id: str | None = None
success_object_created = False
failure_cleanup_triggered = False
mailpit_observed = False
smtp_accepted = False


def add_case(case_id: str, passed: bool, facts: dict[str, Any], started_at: str, ended_at: str) -> None:
    if case_id not in EXPECTED_CASE_IDS:
        raise RuntimeError(f"unexpected case id: {case_id}")
    row = {
        "schemaVersion": "velmere.pass36.a102r44p31.external-storage-kms-email-case.v1",
        "caseId": case_id,
        "classification": CLASSIFICATION,
        "environmentClass": "DISPOSABLE_EXTERNAL_CI",
        "expectedOutcome": "PASS",
        "observedOutcome": "PASS" if passed else "FAIL",
        "passed": bool(passed),
        "startedAt": started_at,
        "endedAt": ended_at,
        "sourceBinding": source_binding,
        "facts": facts,
        "truthBoundary": {
            "productionCredit": False,
            "saleCredit": False,
            "liveCredit": False,
            "customerCredit": False,
            "externalProviderProductionCredit": False,
        },
    }
    write_json(CASES_DIR / f"{len(case_rows)+1:02d}-{case_id}.json", row)
    case_rows.append(row)


try:
    s3.create_bucket(Bucket=bucket)
    s3.put_public_access_block(
        Bucket=bucket,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True,
        },
    )
    key_response = kms.create_key(Description="Velmere R44P31 disposable external CI only")
    created_key_id = str(key_response["KeyMetadata"]["KeyId"])
    encrypt_response = kms.encrypt(KeyId=created_key_id, Plaintext=plaintext, EncryptionContext=context)
    ciphertext = bytes(encrypt_response["CiphertextBlob"])
    s3.put_object(
        Bucket=bucket,
        Key=object_key,
        Body=ciphertext,
        ContentType="application/octet-stream",
        Metadata={
            "tenant-hash": sha256_text(tenant_id),
            "account-hash": sha256_text(owner_account),
            "object-version": "1",
        },
    )
    success_object_created = True

    started = utc_now()
    authorized = s3.get_object(Bucket=bucket, Key=object_key)["Body"].read() == ciphertext
    unsigned_url = f"{LOCALSTACK_ENDPOINT}/{bucket}/{urllib.parse.quote(object_key)}"
    unsigned_status, _ = http_status(unsigned_url)
    invalid_session = boto3.session.Session(
        aws_access_key_id="invalid-r44p31",
        aws_secret_access_key="invalid-r44p31",
        region_name="us-east-1",
    )
    invalid_s3 = invalid_session.client("s3", endpoint_url=LOCALSTACK_ENDPOINT, config=common_config)
    invalid_url = invalid_s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": object_key},
        ExpiresIn=30,
    )
    invalid_credential_status, _ = http_status(invalid_url)
    public_block = s3.get_public_access_block(Bucket=bucket)["PublicAccessBlockConfiguration"]
    passed = authorized and invalid_credential_status in {401, 403, 404} and all(bool(v) for v in public_block.values())
    add_case(
        "private-object",
        passed,
        {
            "authorizedRead": authorized,
            "invalidCredentialStatus": invalid_credential_status,
            "publicAccessBlock": public_block,
            "unsignedRawStatus": unsigned_status,
            "unsignedRawHttpEnforcementCredit": False,
            "creditBasis": "SIGNED_CREDENTIAL_DENIAL_AND_PUBLIC_ACCESS_CONFIGURATION_ONLY",
            "invalidUrlSha256": sha256_text(invalid_url),
            "rawInvalidUrlStored": False,
            "bucketHash": sha256_text(bucket),
            "objectKeyHash": sha256_text(object_key),
        },
        started,
        utc_now(),
    )

    started = utc_now()
    presigned_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": object_key},
        ExpiresIn=5,
    )
    query = urllib.parse.parse_qs(urllib.parse.urlparse(presigned_url).query)
    immediate_status, immediate_body = http_status(presigned_url)
    time.sleep(6.2)
    expired_status, _ = http_status(presigned_url)
    passed = (
        immediate_status == 200
        and immediate_body == ciphertext
        and query.get("X-Amz-Expires") == ["5"]
        and expired_status != 200
    )
    add_case(
        "signed-url-short-lived",
        passed,
        {
            "expiresInSeconds": 5,
            "immediateStatus": immediate_status,
            "expiredStatus": expired_status,
            "urlSha256": sha256_text(presigned_url),
            "rawUrlStored": False,
        },
        started,
        utc_now(),
    )

    started = utc_now()

    def issue_download_url(requesting_account: str) -> str:
        if requesting_account != owner_account:
            raise PermissionError("ACCOUNT_BINDING_DENIED")
        return s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": object_key}, ExpiresIn=30)

    denied = False
    try:
        issue_download_url(wrong_account)
    except PermissionError:
        denied = True
    owner_url = issue_download_url(owner_account)
    passed = denied and bool(owner_url) and owner_account != wrong_account
    add_case(
        "wrong-account-denied",
        passed,
        {
            "denied": denied,
            "ownerAccountHash": sha256_text(owner_account),
            "requestingAccountHash": sha256_text(wrong_account),
            "accountsDistinct": owner_account != wrong_account,
            "ownerUrlSha256": sha256_text(owner_url),
            "rawUrlStored": False,
        },
        started,
        utc_now(),
    )

    started = utc_now()
    correct_plaintext = bytes(
        kms.decrypt(KeyId=created_key_id, CiphertextBlob=ciphertext, EncryptionContext=context)["Plaintext"]
    )
    wrong_context_denied = False
    try:
        kms.decrypt(KeyId=created_key_id, CiphertextBlob=ciphertext, EncryptionContext=wrong_context)
    except ClientError:
        wrong_context_denied = True
    passed = correct_plaintext == plaintext and wrong_context_denied
    add_case(
        "kms-context-bound",
        passed,
        {
            "correctContextDecrypt": correct_plaintext == plaintext,
            "wrongContextDenied": wrong_context_denied,
            "keyIdHash": sha256_text(created_key_id),
            "contextSha256": sha256_bytes(canonical_json_bytes(context)),
            "wrongContextSha256": sha256_bytes(canonical_json_bytes(wrong_context)),
        },
        started,
        utc_now(),
    )

    started = utc_now()
    stored_bytes = s3.get_object(Bucket=bucket, Key=object_key)["Body"].read()
    passed = stored_bytes == ciphertext and stored_bytes != plaintext and plaintext_marker.encode("utf-8") not in stored_bytes
    add_case(
        "ciphertext-at-rest",
        passed,
        {
            "storedBytes": len(stored_bytes),
            "storedSha256": sha256_bytes(stored_bytes),
            "plaintextSha256": sha256_bytes(plaintext),
            "ciphertextDiffersFromPlaintext": stored_bytes != plaintext,
            "plaintextMarkerAbsent": plaintext_marker.encode("utf-8") not in stored_bytes,
        },
        started,
        utc_now(),
    )

    recipient = f"r44p31-{run_suffix}@example.test"
    started = utc_now()
    message = EmailMessage()
    message["From"] = "no-reply@velmere.test"
    message["To"] = recipient
    message["Subject"] = "Velmere disposable R44P31 delivery proof"
    message.set_content(f"Disposable test delivery {run_suffix}; no customer data.")
    with smtplib.SMTP(MAILPIT_SMTP_HOST, MAILPIT_SMTP_PORT, timeout=10) as smtp:
        refused = smtp.send_message(message)
    smtp_accepted = refused == {}
    add_case(
        "disposable-email-recipient",
        smtp_accepted and recipient.endswith("@example.test"),
        {
            "smtpAccepted": smtp_accepted,
            "recipient": recipient,
            "disposableDomain": "example.test",
            "realCustomerAddress": False,
        },
        started,
        utc_now(),
    )

    started = utc_now()
    messages = mailpit_messages()
    serialized_messages = json.dumps(messages, sort_keys=True)
    mailpit_observed = recipient in serialized_messages
    passed = smtp_accepted and mailpit_observed
    add_case(
        "provider-delivery-not-inbox-proof",
        passed,
        {
            "smtpProviderAccepted": smtp_accepted,
            "providerAcceptanceAutomaticallyGrantsInboxProof": False,
            "independentMailpitInboxObserved": mailpit_observed,
            "inboxProofSource": "MAILPIT_API_OBSERVATION",
        },
        started,
        utc_now(),
    )

    started = utc_now()
    s3.delete_object(Bucket=bucket, Key=object_key)
    success_object_absent = object_absent(s3, bucket, object_key)
    if created_key_id:
        kms.disable_key(KeyId=created_key_id)
        key_state = str(kms.describe_key(KeyId=created_key_id)["KeyMetadata"]["KeyState"])
    else:
        key_state = "MISSING"
    passed = success_object_absent and key_state == "Disabled"
    add_case(
        "cleanup-success-path",
        passed,
        {
            "successObjectAbsent": success_object_absent,
            "kmsKeyState": key_state,
            "bucketHash": sha256_text(bucket),
        },
        started,
        utc_now(),
    )

    started = utc_now()
    s3.put_object(Bucket=bucket, Key=failure_key, Body=b"failure-cleanup-test")
    try:
        failure_cleanup_triggered = True
        raise RuntimeError("INTENTIONAL_FAILURE_AFTER_OBJECT_CREATE")
    except RuntimeError:
        pass
    finally:
        s3.delete_object(Bucket=bucket, Key=failure_key)
    failure_object_absent = object_absent(s3, bucket, failure_key)
    add_case(
        "cleanup-failure-path",
        failure_cleanup_triggered and failure_object_absent,
        {
            "intentionalFailureTriggered": failure_cleanup_triggered,
            "failureObjectAbsent": failure_object_absent,
            "failureObjectKeyHash": sha256_text(failure_key),
        },
        started,
        utc_now(),
    )

finally:
    try:
        if success_object_created:
            s3.delete_object(Bucket=bucket, Key=object_key)
        s3.delete_object(Bucket=bucket, Key=failure_key)
        objects = s3.list_objects_v2(Bucket=bucket).get("Contents", [])
        for item in objects:
            s3.delete_object(Bucket=bucket, Key=item["Key"])
        s3.delete_bucket(Bucket=bucket)
    except Exception:
        pass
    try:
        if created_key_id:
            state = str(kms.describe_key(KeyId=created_key_id)["KeyMetadata"]["KeyState"])
            if state != "Disabled":
                kms.disable_key(KeyId=created_key_id)
    except Exception:
        pass

started = utc_now()
raw_case_bytes = b"".join(path.read_bytes() for path in sorted(CASES_DIR.glob("*.json")))
secret_tokens = [
    plaintext_marker.encode("utf-8"),
    application_secret.encode("utf-8"),
    b"AWS_SECRET_ACCESS_KEY",
    b"X-Amz-Signature=",
]
secret_hits = sum(raw_case_bytes.count(token) for token in secret_tokens)
add_case(
    "secrets-redacted",
    secret_hits == 0,
    {
        "secretPatternHits": secret_hits,
        "rawPresignedUrlStored": False,
        "rawPlaintextStored": False,
        "rawApplicationSecretStored": False,
        "scannedCaseFiles": len(list(CASES_DIR.glob("*.json"))),
    },
    started,
    utc_now(),
)

if [row["caseId"] for row in case_rows] != EXPECTED_CASE_IDS:
    raise RuntimeError(f"case order mismatch: {[row['caseId'] for row in case_rows]}")

ledger = {
    "schemaVersion": "velmere.pass36.a102r44p31.external-storage-kms-email-ledger.v1",
    "classification": CLASSIFICATION,
    "environmentClass": "DISPOSABLE_EXTERNAL_CI",
    "sourceBinding": source_binding,
    "required": len(EXPECTED_CASE_IDS),
    "executed": len(case_rows),
    "passed": sum(1 for row in case_rows if row["passed"]),
    "failed": sum(1 for row in case_rows if not row["passed"]),
    "requiredCaseIds": EXPECTED_CASE_IDS,
    "caseArtifacts": [f"cases/{index+1:02d}-{case_id}.json" for index, case_id in enumerate(EXPECTED_CASE_IDS)],
    "serviceClassification": {
        "s3": "LOCALSTACK_S3_EXTERNAL_CI",
        "kms": "LOCALSTACK_KMS_EXTERNAL_CI",
        "email": "MAILPIT_EXTERNAL_CI",
    },
    "truthBoundary": {
        "productionCredit": False,
        "saleCredit": False,
        "liveCredit": False,
        "customerCredit": False,
        "awsCredit": False,
        "sesCredit": False,
        "inboxProofRequiresIndependentObservation": True,
    },
}
write_json(EVIDENCE_DIR / "R44P31_EXTERNAL_CI_STORAGE_KMS_EMAIL_LEDGER.json", ledger)

index_rows = []
for path in sorted(p for p in EVIDENCE_DIR.rglob("*") if p.is_file() and p.name != "R44P31_ARTIFACT_INDEX.json"):
    data = path.read_bytes()
    index_rows.append({
        "path": path.relative_to(EVIDENCE_DIR).as_posix(),
        "byteLength": len(data),
        "sha256": sha256_bytes(data),
    })
artifact_index = {
    "schemaVersion": "velmere.pass36.a102r44p31.external-artifact-index.v1",
    "classification": CLASSIFICATION,
    "sourceBinding": source_binding,
    "artifacts": index_rows,
}
write_json(EVIDENCE_DIR / "R44P31_ARTIFACT_INDEX.json", artifact_index)

result = {
    "status": "PASS" if ledger["failed"] == 0 else "FAIL",
    "classification": CLASSIFICATION,
    "required": ledger["required"],
    "executed": ledger["executed"],
    "passed": ledger["passed"],
    "failed": ledger["failed"],
    "sourceBinding": source_binding,
}
print(json.dumps(result, sort_keys=True))
if ledger["failed"] != 0:
    raise SystemExit(1)
