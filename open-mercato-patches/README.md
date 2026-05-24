# Open Mercato — sales_forecasting module patch

Branch: `cursor/sales-forecasting-module-1fe4`  
Commit: `7469b1a` (in local clone `open-mercato/`)

Upstream push to `open-mercato/open-mercato` was denied from this environment (403). Apply on your fork:

```bash
git clone https://github.com/open-mercato/open-mercato.git
cd open-mercato
git checkout -b cursor/sales-forecasting-module-1fe4
git am /path/to/dwthon-rag/open-mercato-patches/*.patch
yarn install
yarn workspace @open-mercato/sales-forecasting test
yarn db:migrate
```

Spec: `open-mercato/.ai/specs/2026-05-24-sales-forecasting-module-starter-prompt.md`
