import sys, warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, '.')

import pandas as pd
from services.pdf_charts import generate_pdf_charts
from services.stats import analyze
from services.insights_service import generate_insights
from services.exporter import export_pdf

# Use header=1 to try to pick up the actual header row
df = pd.read_excel('../IA analysis - IA -1.xlsx', header=1)
print('Columns:', list(df.columns)[:8])
print('Shape:', df.shape)

stats    = analyze(df)
insights = generate_insights(stats, list(df.columns), 'test')
charts   = generate_pdf_charts(df, stats)
print('Charts generated:', len(charts))
for c in charts:
    print(' ', c['type'], '-', c['title'], '-', len(c['png']), 'bytes')

pdf = export_pdf('test_file / Sheet1', stats, insights, charts)
print('PDF size:', len(pdf), 'bytes')

with open('test_output.pdf', 'wb') as f:
    f.write(pdf)
print('Saved to test_output.pdf')
