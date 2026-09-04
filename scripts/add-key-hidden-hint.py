# -*- coding: utf-8 -*-
"""Insert 'keyHiddenHint' right after 'keyWarning' inside messages/*.json."""
import io, os, re

MESSAGES = r"C:/Users/lsb/.workbuddy/apps/prompts-chat/messages"

HINTS = {
    "zh": "出于安全考虑，密钥以哈希保存，生成后不再回显。如需查看请重新生成。",
    "en": "For security, your key is stored hashed and cannot be shown again. Regenerate a key if you need a new one.",
    "tr": "Güvenlik nedeniyle anahtarınız karma (hash) olarak saklanır ve tekrar gösterilemez. Yeni bir anahtar için yeniden oluşturun.",
    "es": "Por seguridad, tu clave se guarda con hash y no se puede volver a mostrar. Genera una nueva si la necesitas.",
    "ja": "セキュリティのため、キーはハッシュ化して保存され、再度表示されません。新しいキーが必要な場合は再生成してください。",
    "ar": "لأسباب أمنية، يتم تخزين المفتاح كقيمة مشفرة (hash) ولا يمكن عرضه مرة أخرى. أنشئ مفتاحًا جديدًا إذا احتجت إليه.",
    "pt": "Por segurança, sua chave é armazenada com hash e não pode ser exibida novamente. Gere uma nova se precisar.",
    "fr": "Pour des raisons de sécurité, votre clé est stockée sous forme de hachage et ne peut plus être affichée. Régénérez une clé si besoin.",
    "it": "Per sicurezza, la chiave viene memorizzata come hash e non può essere mostrata di nuovo. Rigenera una chiave se ti serve.",
    "de": "Aus Sicherheitsgründen wird Ihr Schlüssel gehasht gespeichert und kann nicht erneut angezeigt werden. Generieren Sie bei Bedarf einen neuen Schlüssel.",
    "nl": "Om veiligheidsredenen wordt je sleutel gehasht opgeslagen en kan deze niet opnieuw worden weergegeven. Genereer zo nodig een nieuwe sleutel.",
    "ko": "보안을 위해 키는 해시로 저장되며 다시 표시되지 않습니다. 필요하면 키를 다시 생성하세요.",
    "ru": "В целях безопасности ключ хранится в виде хеша и больше не отображается. При необходимости создайте новый ключ.",
    "he": "מטעמי אבטחה, המפתח נשמר כהאש ולא ניתן להציגו שוב. צור מפתח חדש אם אתה זקוק לו.",
    "el": "Για λόγους ασφαλείας, το κλειδί αποθηκεύεται ως hash και δεν μπορεί να εμφανιστεί ξανά. Δημιουργήστε νέο κλειδί αν χρειάζεστε.",
    "fa": "به دلایل امنیتی، کلید شما به صورت هش ذخیره می‌شود و دوباره نمایش داده نمی‌شود. در صورت نیاز کلید جدیدی بسازید.",
    "az": "Təhlükəsizlik üçün açarınız hash şəklində saxlanılır və yenidən göstərilə bilməz. Lazım olsa yeni açar yaradın.",
}

pattern = re.compile(r'^(\s*)"keyWarning":\s*".*?",\s*$')

changed, skipped = [], []
for fname in sorted(os.listdir(MESSAGES)):
    if not fname.endswith(".json"):
        continue
    lang = fname[:-5]
    if lang not in HINTS:
        skipped.append(fname)
        continue
    path = os.path.join(MESSAGES, fname)
    with io.open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    if any('"keyHiddenHint"' in ln for ln in lines):
        skipped.append(fname + " (already has key)")
        continue
    out, done = [], False
    for ln in lines:
        out.append(ln)
        m = pattern.match(ln.rstrip("\n"))
        if m and not done:
            indent = m.group(1)
            hint = HINTS[lang].replace('"', '\\"')
            out.append('%s"keyHiddenHint": "%s",\n' % (indent, hint))
            done = True
    if done:
        with io.open(path, "w", encoding="utf-8", newline="\n") as f:
            f.writelines(out)
        changed.append(fname)
    else:
        skipped.append(fname + " (keyWarning line not found)")

print("changed:", changed)
print("skipped:", skipped)

# validate JSON
import json
for fname in changed:
    with io.open(os.path.join(MESSAGES, fname), "r", encoding="utf-8") as f:
        data = json.load(f)
    # locate keyHiddenHint inside apiKey block
    found = False
    for k, v in data.items():
        if isinstance(v, dict) and "keyHiddenHint" in v:
            found = True
            break
    print(fname, "valid JSON, key placed:", found)
