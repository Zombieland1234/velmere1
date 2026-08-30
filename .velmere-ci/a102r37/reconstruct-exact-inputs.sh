#!/usr/bin/env bash
set -euo pipefail
OUT="${1:?output directory required}"
SRC=.velmere-ci/a102r36/lock-b64
mkdir -p "$OUT/evidence"
cat > /tmp/a102r37-chunks.tsv <<'EOF'
part-01.txt	20000	175cfc5ab64862b6ab96567c418011ee216733e0
part-02.txt	20000	f8b5c06e9dbabeb70711f8b47e8212c11b664ec9
part-0300.txt	1000	2ac1563a5c173986696720abb7ca1debf648d562
part-0301.txt	1000	5726e460d9af354293ed8ffec7b2551c3c965986
part-0302.txt	1000	72ccaaa4e1cfe696c939cc286bac2bf31b06e1d1
part-0303.txt	1000	da66e79ad3d5cffae586b908fc760881607b03ec
part-0304.txt	1000	f5e152301794b129d8dc1d6ca9073b8026673be9
part-031.txt	5000	bf9f5174bdec4bb728b456d219c49793d1c57a42
part-032.txt	5000	06b97ec0c82b62d96b6d1ecf67d9b314975ca01c
part-033.txt	5000	f7adf937d9802164ecd627bebbfed9d716997062
part-040.txt	5000	f2beefb2bbef20fec941370bab6836690b44fbe3
part-041.txt	5000	3363c657d7a8af09881930bb0a0f50c8ff20259a
part-042.txt	5000	c8f2809d711fd9ba780833bccc693a8a393652dd
part-043.txt	5000	a8a38f6014c554046f95beda54d7d53a25f863c6
part-050.txt	5000	91422031f544f3425714aa301298e7f5a886458a
part-0510.txt	1000	a58b7f1e04043668828d2fda2c28b94bbdebe37d
part-0511.txt	1000	0ecff07faa38fb0ea8f1f24b876521a93956f3ae
part-0512.txt	1000	e90e7fa5745558668e4aa685274eaf910f6fb870
part-0513.txt	1000	3eec4a8cffaee585e5e61d23684354d0a6382b5b
part-0514.txt	1000	52d2baa7d685349cce3ffb67e8c72ff625adff3f
part-0520.txt	1000	3de204eb6a4384912a974b9bc20f1fdfcdbabfcc
part-0521.txt	1000	1d6511dd5a1b6caa17dd66b4875a66341673091d
part-0522.txt	1000	5e8efe08b8ac68b33345d6aacab7a8ce1143db1a
part-0523.txt	1000	36b0e0f7fc1b7e64e17d43db69fd394b3036104c
part-0524.txt	1000	69c66ecc78ef1ece2f787db8741f47904c680167
part-0530.txt	1000	8fa891438b0b8fbe8e8ec7ff862cf9e7222db1e1
part-0531.txt	1000	a02ef95435c35dcdaf495ac1203ebb9327cd2ff4
part-0532.txt	324	6d637babd2c17b4ac4522a6af95db434316bccca
EOF
: > /tmp/package-lock.json.gz.b64
while IFS=$'\t' read -r name expected_bytes expected_blob; do
  path="$SRC/$name"
  actual_bytes="$(wc -c < "$path" | tr -d ' ')"
  actual_blob="$(git hash-object "$path")"
  printf '%s bytes=%s blob=%s\n' "$name" "$actual_bytes" "$actual_blob" | tee -a "$OUT/evidence/chunk-verification.log"
  test "$actual_bytes" = "$expected_bytes"
  test "$actual_blob" = "$expected_blob"
  cat "$path" >> /tmp/package-lock.json.gz.b64
done < /tmp/a102r37-chunks.tsv
pkg=.velmere-ci/a102r36/package.json.gz.b64
test "$(wc -c < "$pkg" | tr -d ' ')" = '776'
test "$(git hash-object "$pkg")" = 'c1e2d1f4ce111b2614b061919e52dd3766ea6735'
base64 -d /tmp/package-lock.json.gz.b64 | gzip -d > "$OUT/package-lock.json"
base64 -d "$pkg" | gzip -d > "$OUT/package.json"
printf '%s  %s\n' '03e0f07a0da9be378e9f0cb75f25afd619530b9f3ee5f1b9ce4d8b6083408219' "$OUT/package-lock.json" | sha256sum -c -
printf '%s  %s\n' 'e95fdd37f846ae2dd6503a8ff0dcebf2b3d1f23fed461fca61724236219a5aaf' "$OUT/package.json" | sha256sum -c -
sha256sum "$OUT/package.json" "$OUT/package-lock.json" | tee "$OUT/evidence/input-sha256.txt"
