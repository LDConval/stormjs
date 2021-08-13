@echo off
set BABEL_ENV=cjs
call npx babel src/lib/ --out-dir dist/
set BABEL_ENV=esm
call npx babel src/lib/ --out-dir dist/ --keep-file-extension