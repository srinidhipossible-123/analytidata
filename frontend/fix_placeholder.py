import re

path = r'src\pages\admin\AdminDashboard.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Fix the broken placeholder - the issue is an unclosed string on line 330
# Pattern: onChange line, then broken placeholder line, then min line
bad = 'placeholder=" e.g. 25 or 100\\\n                       min={1} max={500} className="input-glass" />'
good = 'placeholder="e.g. 25 or 100"\n                       min={1} max={500} className="input-glass" />'

if bad in content:
    content = content.replace(bad, good)
    print('Fixed via exact match')
else:
    # Try line-by-line replacement
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        if 'placeholder=" e.g. 25 or 100\\' in lines[i]:
            # This line is broken - replace with proper placeholder + absorb next min line
            indent = '                       '
            new_lines.append(f'{indent}placeholder="e.g. 25 or 100"')
            # skip to next line (which has min=... already)
            i += 1
            continue
        new_lines.append(lines[i])
        i += 1
    content = '\n'.join(new_lines)
    print('Fixed via line scan')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(path, encoding='utf-8') as f:
    for ln, line in enumerate(f, 1):
        if 'placeholder' in line and 'maxMarks' not in line and 'Marks' not in line:
            if 'marks' in line.lower() or '25' in line or '100' in line:
                print(f'  Line {ln}: {line.rstrip()}')
