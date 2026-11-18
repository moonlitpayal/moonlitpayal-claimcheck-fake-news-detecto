import type { BenchmarkCase } from '../types.ts';

export const BENCHMARK_ARTICLES: BenchmarkCase[] = [
  // 10 Real News Articles
  {
    id: 'r1',
    title: 'Solar power lowers daytime electricity costs',
    expected: 'LIKELY_REAL',
    text: 'Solar panels convert sunlight directly into electricity using photovoltaic cells. Because solar output peaks during sunny afternoon hours, regions with high solar adoption often see lower wholesale daytime power prices. Utilities use battery storage to shift surplus midday solar energy into evening hours.',
  },
  {
    id: 'r2',
    title: 'Monsoon rainfall replenishes reservoirs',
    expected: 'LIKELY_REAL',
    text: 'India receives the majority of its annual rainfall during the southwest monsoon between June and September. Steady seasonal rain increases water levels in major river basins and agricultural reservoirs. Farmers rely on healthy reservoir storage to irrigate winter crops after the rainy season ends.',
  },
  {
    id: 'r3',
    title: 'James Webb telescope observes distant galaxies',
    expected: 'LIKELY_REAL',
    text: 'The James Webb Space Telescope orbits the Sun near the second Lagrange point and observes the universe primarily in infrared light. Because light from distant galaxies is stretched by cosmic expansion into infrared wavelengths, Webb can detect galaxies formed in the early universe. Astronomers use these spectra to study star formation.',
  },
  {
    id: 'r4',
    title: 'Handwashing reduces hospital infections',
    expected: 'LIKELY_REAL',
    text: 'Washing hands with soap and water removes dirt, bacteria, and viruses from the skin. Public health agencies including the WHO recommend strict hand hygiene for clinical staff before and after patient contact. Consistent hygiene practices lower the spread of hospital-acquired infections.',
  },
  {
    id: 'r5',
    title: 'Electric buses cut urban tailpipe emissions',
    expected: 'LIKELY_REAL',
    text: 'Battery-electric city buses have no exhaust tailpipes and produce zero direct emissions on city streets. When transit agencies replace older diesel buses with electric models, local roadside particulate pollution decreases. Quiet electric motors also reduce street-level traffic noise.',
  },
  {
    id: 'r6',
    title: 'Antibiotics treat bacterial infections, not viruses',
    expected: 'LIKELY_REAL',
    text: 'Antibiotics work by disrupting cell walls or protein synthesis in bacteria. Because viruses do not have bacterial cell structures, standard antibiotics cannot cure viral illnesses such as the common cold. Doctors advise against unnecessary antibiotic use to prevent antimicrobial resistance.',
  },
  {
    id: 'r7',
    title: 'Ocean tides follow the gravitational pull of the Moon',
    expected: 'LIKELY_REAL',
    text: 'Earth’s ocean tides rise and fall mainly due to the gravitational attraction between Earth, the Moon, and the Sun. When the Sun and Moon align during full and new moons, coastal regions experience higher spring tides. Port authorities publish tide tables using predictable astronomical cycles.',
  },
  {
    id: 'r8',
    title: 'Regular physical exercise supports cardiovascular health',
    expected: 'LIKELY_REAL',
    text: 'Aerobic exercise such as brisk walking, cycling, or swimming strengthens the heart muscle and improves blood circulation. Medical studies show regular moderate exercise helps lower resting blood pressure over time. Health guidelines recommend at least 150 minutes of moderate activity per week for adults.',
  },
  {
    id: 'r9',
    title: 'Deforestation increases soil erosion on hillsides',
    expected: 'LIKELY_REAL',
    text: 'Tree roots anchor topsoil in place and help rainwater soak gradually into the ground. When steep hillsides are cleared of forest cover, heavy rain washes away exposed soil much faster. This runoff can clog downstream rivers with sediment and raise local flood risk.',
  },
  {
    id: 'r10',
    title: 'Vaccination trains the immune system safely',
    expected: 'LIKELY_REAL',
    text: 'Vaccines introduce a harmless piece or weakened form of a pathogen so the immune system learns to recognize it. After vaccination, white blood cells create antibodies and memory cells tailored to that threat. If the real pathogen appears later, the body can respond much faster.',
  },

  // 10 Fake News Articles
  {
    id: 'f1',
    title: 'Snowstorm blankets coastal Mumbai beaches',
    expected: 'LIKELY_FAKE',
    text: 'A sudden blizzard dumped three feet of natural snow across Mumbai beaches overnight, freezing the Arabian Sea shoreline solid. Local officials announced that penguins migrated into Marine Drive due to sub-zero tropical weather. Experts claim Mumbai routinely experiences heavy winter snowfall every November.',
  },
  {
    id: 'f2',
    title: 'COVID-19 vaccines create magnetic arms and alter DNA',
    expected: 'LIKELY_FAKE',
    text: 'Viral social media posts claim COVID-19 vaccines contain microscopic metallic chips that make human arms magnetic. The posts further allege that these vaccines permanently rewrite human DNA within 24 hours. According to the post, doctors are secretly hiding this magnetic side effect worldwide.',
  },
  {
    id: 'f3',
    title: '5G cellular towers boil rainwater mid-air',
    expected: 'LIKELY_FAKE',
    text: 'A viral rumor claims 5G cell towers operate at microwave oven power levels that boil raindrops before they reach the ground. Because the towers allegedly evaporate clouds overhead, the post claims cities with 5G never experience rain again. Telecom companies supposedly conceal steamed streets every night.',
  },
  {
    id: 'f4',
    title: 'Drinking bleach cures all viral infections overnight',
    expected: 'LIKELY_FAKE',
    text: 'An anonymous blog claims drinking household chlorine bleach safely eliminates every known virus in the human body within six hours. The article insists bleach is a natural vitamin suppressed by hospitals. It advises patients to replace water with diluted bleach daily.',
  },
  {
    id: 'f5',
    title: 'The Moon is a hollow metal spacecraft built in 1965',
    expected: 'LIKELY_FAKE',
    text: 'A viral video claims astronomers confirmed the Moon is a hollow titanium spacecraft launched secretly in 1965. Because no ancient civilization ever recorded seeing a moon before 1965, the video argues gravity on Earth was invented that same year. NASA allegedly paints craters onto the metal shell.',
  },
  {
    id: 'f6',
    title: 'Charging phones in microwave ovens restores battery health',
    expected: 'LIKELY_FAKE',
    text: 'A trending post claims placing smartphones inside a kitchen microwave for 60 seconds wirelessly recharges lithium batteries to 100 percent. The post asserts microwave radiation repairs cracked glass screens automatically. Phone makers supposedly hide this trick to sell more chargers.',
  },
  {
    id: 'f7',
    title: 'Flat Earth wall stops airplanes from flying south',
    expected: 'LIKELY_FAKE',
    text: 'A conspiracy post asserts the Earth is a flat disc surrounded by a 10,000-foot ice wall guarded by satellites that block all southern flights. Because no airplane has ever crossed Antarctica, the post claims global airline maps are computer-generated fiction. Compass needles allegedly point north using underground magnets.',
  },
  {
    id: 'f8',
    title: 'Eating raw onions absorbs Wi-Fi signals from rooms',
    expected: 'LIKELY_FAKE',
    text: 'A health meme claims placing cut raw onions on bedroom corners pulls harmful Wi-Fi radiation out of the air and turns black within an hour. The post claims onions act as biological radio antennas that also cure nearsightedness overnight. Routers allegedly stop working when placed near onions.',
  },
  {
    id: 'f9',
    title: 'Great Wall of China is the only structure blocking hurricanes',
    expected: 'LIKELY_FAKE',
    text: 'A viral article claims the Great Wall of China was built 5,000 feet tall specifically to deflect Pacific Ocean hurricanes away from Beijing. Because stone walls block planetary jet streams, the article asserts China has never experienced wind storms. Satellites supposedly blur the wall height on maps.',
  },
  {
    id: 'f10',
    title: 'Bananas contain zero potassium and are synthetic plastic',
    expected: 'LIKELY_FAKE',
    text: 'A social post claims modern grocery bananas are lab-molded biodegradable plastic invented in 1998 and contain zero potassium. Because plastic does not grow on plants, the post argues banana trees do not exist in nature. Farmers allegedly assemble bananas in underground factories.',
  },
];
