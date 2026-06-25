<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BYD Logistics Navigator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              'byd-blue': '#0033A0',
              'byd-red': '#D9002C',
              'navy': {
                'light': '#2a3f54',
                'DEFAULT': '#1e2a3a',
                'dark': '#17212b',
              },
              'accent': {
                'blue': '#3498db',
                'green': '#2ecc71',
                'orange': '#f39c12',
                'red': '#e74c3c',
              },
            },
            animation: {
              'fade-in': 'fadeIn 0.3s ease-out',
              'scale-in': 'scaleIn 0.3s ease-out',
            },
            keyframes: {
              fadeIn: {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' },
              },
              scaleIn: {
                '0%': { opacity: '0', transform: 'scale(0.95)' },
                '100%': { opacity: '1', transform: 'scale(1)' },
              }
            }
          }
        }
      }
    </script>
    <!-- SheetJS for Excel parsing -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <!-- Chart.js for advanced charting -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
    <!-- jsPDF for PDF generation -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"></script>
<script type="importmap">
{
  "imports": {
    "react/": "https://aistudiocdn.com/react@^19.2.0/",
    "react": "https://aistudiocdn.com/react@^19.2.0",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.0/",
    "firebase/": "https://aistudiocdn.com/firebase@^12.5.0/"
  }
}
</script>
<link rel="stylesheet" href="/index.css">
</head>
<body class="bg-gray-100">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
</body>
</html>