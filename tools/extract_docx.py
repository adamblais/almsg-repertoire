"""Print the text of meeting programs.

Usage:
  python3 -I tools/extract_docx.py <gmail-raw.json> <outdir>   # Gmail RAW get_message dump: save + print .docx attachments
  python3 -I tools/extract_docx.py <program.docx> [...]         # print local .docx files
"""
import base64, email, html, json, sys, io, zipfile, re, os
from email import policy


def docx_text(data):
    xml = zipfile.ZipFile(io.BytesIO(data)).read('word/document.xml').decode()
    xml = re.sub(r'</w:p>', '\n', xml)
    xml = re.sub(r'</w:tc>', ' | ', xml)
    xml = re.sub(r'<w:tab/>', '\t', xml)
    return html.unescape(re.sub(r'<[^>]+>', '', xml))


if sys.argv[1].lower().endswith('.docx'):
    for path in sys.argv[1:]:
        print('=== File:', os.path.basename(path))
        print(docx_text(open(path, 'rb').read()))
    sys.exit(0)

src, outdir = sys.argv[1], sys.argv[2]
d = json.load(open(src))
raw = base64.urlsafe_b64decode(d['raw'] + '==')
msg = email.message_from_bytes(raw, policy=policy.default)
print('Subject:', msg['subject'], '| Date:', msg['date'])
for part in msg.iter_attachments():
    name = part.get_filename()
    data = part.get_payload(decode=True)
    path = os.path.join(outdir, name)
    open(path, 'wb').write(data)
    print('saved', path)
    if name.lower().endswith('.docx'):
        print(docx_text(data))
