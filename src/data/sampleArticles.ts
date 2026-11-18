export interface SampleArticle {
  id: string;
  label: string;
  description: string;
  text: string;
}

export const SAMPLE_ARTICLES: SampleArticle[] = [
  {
    id: 'real-weather',
    label: 'Real News: City Heatwave',
    description: 'Factual reporting with connected cause-and-effect claims',
    text: 'The India Meteorological Department reported that temperatures in New Delhi reached 44 degrees Celsius this week due to dry westerly winds. Because extreme afternoon heat increases electricity demand for air conditioning, the city power grid recorded its highest summer load so far. Local hospitals have opened cooling wards to help outdoor workers stay hydrated during peak afternoon hours.',
  },
  {
    id: 'fake-health',
    label: 'Fake News: Magnetic Vaccines',
    description: 'Contradicts scientific evidence and makes unsupported leaps',
    text: 'Viral social media posts claim that COVID-19 vaccines contain microscopic metallic chips that make human arms magnetic. The posts further allege that these vaccines permanently rewrite human DNA within 24 hours. According to the post, governments are secretly hiding this magnetic side effect from doctors worldwide.',
  },
  {
    id: 'mixed-opinion',
    label: 'Mixed: Opinion & Policy',
    description: 'Blends real city statistics with personal opinions',
    text: 'Mumbai receives over 2,000 millimeters of rainfall during the annual monsoon season between June and September. Heavy downpours frequently slow down suburban rail commutes during morning rush hour. City planners are completely failing the public, and the new metro line is the worst transit project ever built.',
  },
];
