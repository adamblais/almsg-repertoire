"""Extract .docx attachments from a Gmail RAW get_message JSON dump and print their text."""
import base64, email, json, sys, io, zipfile, re, os
from email import policy

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
        z = zipfile.ZipFile(io.BytesIO(data))
        xml = z.read('word/document.xml').decode()
        # paragraphs and table cells
        xml = re.sub(r'</w:p>', '\n', xml)
        xml = re.sub(r'</w:tc>', ' | ', xml)
        xml = re.sub(r'<w:tab/>', '\t', xml)
        text = re.sub(r'<[^>]+>', '', xml)
        import html
        print(html.unescape(text))
