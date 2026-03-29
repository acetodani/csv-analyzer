# 📊 CSV Analyzer

**Drop any CSV file and instantly get interactive charts — no signup, no server, no limits.**

![CSV Analyzer](https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,12,20&height=3&width=100%)

---

## ✨ Features

- **Drag & drop upload** — drop a CSV or browse for a file
- **Auto column detection** — numeric, categorical, and date columns are detected automatically
- **3 chart types** — switch between Bar, Line, and Pie per column instantly
- **Stats panels** — min, max, mean, and median for every numeric column
- **Live filters** — filter rows by any column with instant chart updates
- **Shareable links** — encode your entire dataset into a URL and share it
- **PNG export** — download any chart as an image
- **CSV export** — export your filtered data back as a clean CSV
- **Large file support** — files over 100k rows are automatically sampled
- **100% private** — all processing happens in your browser, nothing is ever uploaded

---

## 🚀 Getting Started

```bash
git clone https://github.com/acetodani/csv-analyzer.git
cd csv-analyzer/src
npm install
npm run dev
```

Then open `http://localhost:1234` in your browser.

### Build for production

```bash
npm run build
```

Output goes to `src/dist/`.

---

## 🗂 Project Structure

```
csv-analyzer/
└── src/
    ├── index.html   # App shell, landing page, dashboard layout
    ├── app.js       # All logic — parsing, analysis, charts, filters
    ├── style.css    # Styles — glassmorphism, animations, responsive
    ├── package.json
    └── package-lock.json
```

---

## 🛠 Built With

- [Chart.js](https://www.chartjs.org/) — interactive chart rendering
- [Papa Parse](https://www.papaparse.com/) — fast, robust CSV parsing
- [Parcel](https://parceljs.org/) — zero-config bundler

---

## 📸 How It Works

1. **Upload** a CSV file via drag & drop or the file browser
2. Columns are **auto-analyzed** — numeric columns get histograms with stats, categorical columns get bar charts, date columns get line charts over time
3. Use the **type switcher** on each card to flip between Bar / Line / Pie
4. **Add filters** to narrow down rows — charts update live
5. **Share** your view with a single link, or **download** any chart as PNG

---

## License

MIT
