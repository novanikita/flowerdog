# Скриншоты

Снимает каждую страницу из корня целиком в 390 и 1440px и сравнивает два набора попиксельно.

```bash
cd scripts/screenshots && npm install
node shoot.mjs before                 # эталон из рабочей копии
node shoot.mjs before --root /tmp/x   # или из другой папки, например git archive
node shoot.mjs after --only index,about --widths 390
node compare.mjs before after         # таблица и картинки разницы в _shots/diff-before-after/
```

Анимации, видео и ленивая загрузка выключены, язык русский, шапка приводится к показанному состоянию. Результаты в `_shots/`, папка в `.gitignore`.
