#!/usr/bin/env python3
import argparse, json, os, pathlib, shutil, stat, tarfile, tempfile

def fail(code, detail=None):
    payload={"status":"FAIL","error":code}
    if detail is not None: payload["detail"]=detail
    print(json.dumps(payload, sort_keys=True))
    raise SystemExit(2)

def safe_name(name):
    if not isinstance(name,str) or not name or "\\" in name: fail("tar_path_invalid", name)
    p=pathlib.PurePosixPath(name)
    if p.is_absolute() or any(part in ("", ".", "..") for part in p.parts): fail("tar_path_invalid", name)
    return p

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("archive")
    ap.add_argument("--extract")
    ap.add_argument("--expected-root", required=True)
    ap.add_argument("--max-entries", type=int, default=10000)
    ap.add_argument("--max-total-bytes", type=int, default=536870912)
    ap.add_argument("--max-file-bytes", type=int, default=268435456)
    ap.add_argument("--allow-symlink", action="append", default=[])
    args=ap.parse_args()
    archive=os.path.abspath(args.archive)
    if not os.path.isfile(archive): fail("tar_archive_missing", archive)
    entries=[]; total=0; seen=set(); allowed_symlinks=set(args.allow_symlink)
    try:
        tf=tarfile.open(archive, mode="r:xz")
    except Exception as e: fail("tar_open_failed", str(e))
    with tf:
        members=tf.getmembers()
        if len(members)>args.max_entries: fail("tar_entry_budget_exceeded", len(members))
        for m in members:
            p=safe_name(m.name.rstrip("/") if m.isdir() else m.name)
            if p.parts[0] != args.expected_root: fail("tar_root_mismatch", m.name)
            normalized=str(p)
            if normalized in seen: fail("tar_duplicate_path", normalized)
            seen.add(normalized)
            if m.issym():
                if normalized not in allowed_symlinks: fail("tar_unsafe_symlink", {"name":m.name,"target":m.linkname})
                link=pathlib.PurePosixPath(m.linkname)
                if link.is_absolute(): fail("tar_symlink_target_invalid", {"name":m.name,"target":m.linkname})
                resolved=pathlib.PurePosixPath(*p.parent.parts, *link.parts)
                stack=[]
                for part in resolved.parts:
                    if part in ("", "."): continue
                    if part == "..":
                        if not stack: fail("tar_symlink_target_escape", {"name":m.name,"target":m.linkname})
                        stack.pop()
                    else: stack.append(part)
                if not stack or stack[0] != args.expected_root: fail("tar_symlink_target_escape", {"name":m.name,"target":m.linkname})
                entries.append({"path":normalized,"type":"symlink","bytes":0,"mode":m.mode & 0o777,"target":m.linkname})
                continue
            if m.islnk() or m.isdev() or m.isfifo(): fail("tar_unsafe_entry_type", {"name":m.name,"type":m.type.decode(errors="ignore") if isinstance(m.type,bytes) else str(m.type)})
            if not (m.isdir() or m.isfile()): fail("tar_unsupported_entry_type", m.name)
            if m.isfile():
                if m.size<0 or m.size>args.max_file_bytes: fail("tar_file_budget_exceeded", {"name":m.name,"size":m.size})
                total += m.size
                if total>args.max_total_bytes: fail("tar_total_budget_exceeded", total)
            entries.append({"path":normalized,"type":"directory" if m.isdir() else "file","bytes":m.size if m.isfile() else 0,"mode":m.mode & 0o777})
        if args.extract:
            dest=os.path.abspath(args.extract)
            os.makedirs(dest, exist_ok=True)
            root=os.path.realpath(dest)
            for m in members:
                p=safe_name(m.name.rstrip("/") if m.isdir() else m.name)
                target=os.path.realpath(os.path.join(dest,*p.parts))
                if target != root and not target.startswith(root+os.sep): fail("tar_extract_escape", m.name)
                if m.issym(): continue
                if m.isdir(): os.makedirs(target, exist_ok=True); continue
                os.makedirs(os.path.dirname(target), exist_ok=True)
                source=tf.extractfile(m)
                if source is None: fail("tar_extract_missing_content", m.name)
                temp=target+".a62tmp"
                with source, open(temp,"wb") as out: shutil.copyfileobj(source,out,1024*1024)
                os.chmod(temp,m.mode & 0o777)
                os.replace(temp,target)
    print(json.dumps({"status":"PASS","archive":archive,"expectedRoot":args.expected_root,"entries":len(entries),"totalFileBytes":total,"inventory":entries}, sort_keys=True))

if __name__=="__main__": main()
