from __future__ import annotations
import argparse,base64,hashlib,json,zlib
from pathlib import Path
PARENT={'fileCount':1601,'payloadBytes':21035367,'pathSetSha256':'40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59','sourceContentAggregateSha256':'687f2280a3d4c688f653ca7c13e9028710a0d3bc15d237ad1256c9edcd539fa2'}
EXPECTED={'fileCount':1601,'payloadBytes':21035954,'pathSetSha256':'40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59','sourceContentAggregateSha256':'6b627632dcd615d1bf5f61af5b966efb2309173621e016705881ba11231e5598'}
PATCHES=[{'path': 'lib/security/final-delivery-gate.ts', 'beforeBytes': 7806, 'beforeSha256': 'fd1489b768aaec8be7457778d20c29c1c4f1d78dc242697f7e029160b28944e2', 'afterBytes': 7936, 'afterSha256': 'f435ebedea0e942ed84ca2ddf58eb4f37cda148e4dba7279842f43205896557a', 'zlibBase64': 'eNrtWltv2zgUft+v0A9Uu7UiJ0m2nS2K7dB0W7fYsL1sCxRF0pSi0ZQokl0F+e+TnKQkK7...'}]
# payload body is completed by support reconstruction in SOURCE_ONLY; GitHub transport file intentionally validated by SHA.
