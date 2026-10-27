// Brain atlas data. x/y are % positions on the lateral-view image (front facing left).
// Deep structures are not visible from the surface; their x/y mark the approximate projected location.
export type Region = { name: string; group: string; def: string; x: number; y: number; deep?: boolean };

export const REGIONS: Region[] = [
  // Frontal lobe
  { group: "Frontal lobe", name: "Frontal pole", def: "The tip of the frontal lobe, involved in complex planning, multitasking and evaluating future goals.", x: 11, y: 44 },
  { group: "Frontal lobe", name: "Orbitofrontal cortex", def: "The underside of the frontal lobe above the eyes that links emotion with decision-making and reward.", x: 18, y: 56 },
  { group: "Frontal lobe", name: "Dorsolateral prefrontal cortex", def: "A key hub for working memory, attention control and abstract reasoning.", x: 20, y: 30 },
  { group: "Frontal lobe", name: "Superior frontal gyrus", def: "The top ridge of the frontal lobe, involved in self-awareness, higher cognition and laughter.", x: 30, y: 12 },
  { group: "Frontal lobe", name: "Middle frontal gyrus", def: "The middle ridge of the frontal lobe that supports attention, numeracy and working memory.", x: 25, y: 24 },
  { group: "Frontal lobe", name: "Inferior frontal gyrus", def: "The lowest frontal ridge, important for language, inhibition and understanding others' actions.", x: 24, y: 40 },
  { group: "Frontal lobe", name: "Pars orbitalis", def: "The front part of the inferior frontal gyrus, involved in the meaning of words and sentences.", x: 23, y: 49 },
  { group: "Frontal lobe", name: "Pars triangularis (Broca's area)", def: "A triangular part of Broca's area that helps select and retrieve the meaning of words.", x: 29, y: 44 },
  { group: "Frontal lobe", name: "Pars opercularis (Broca's area)", def: "The back part of Broca's area that plans the movements needed to produce speech.", x: 34, y: 41 },
  { group: "Frontal lobe", name: "Frontal eye field", def: "A frontal region that controls voluntary eye movements and visual attention.", x: 33, y: 22 },
  { group: "Frontal lobe", name: "Premotor cortex", def: "Area in front of the motor cortex that plans and prepares movements, especially those guided by the senses.", x: 37, y: 30 },
  { group: "Frontal lobe", name: "Supplementary motor area", def: "Top-of-brain region that plans sequences of movements and movements started internally.", x: 38, y: 8 },
  { group: "Frontal lobe", name: "Precentral gyrus (primary motor cortex)", def: "The ridge in front of the central sulcus that sends commands to muscles for voluntary movement.", x: 44, y: 16 },
  // Sulci & fissures
  { group: "Sulci & fissures", name: "Central sulcus", def: "The deep groove separating the frontal lobe from the parietal lobe, between motor and touch areas.", x: 49, y: 20 },
  { group: "Sulci & fissures", name: "Lateral (Sylvian) fissure", def: "The deep groove separating the temporal lobe from the frontal and parietal lobes.", x: 42, y: 47 },
  { group: "Sulci & fissures", name: "Precentral sulcus", def: "The groove just in front of the motor cortex marking the boundary of the premotor area.", x: 40, y: 22 },
  { group: "Sulci & fissures", name: "Postcentral sulcus", def: "The groove just behind the somatosensory cortex marking the start of the parietal association areas.", x: 59, y: 20 },
  { group: "Sulci & fissures", name: "Intraparietal sulcus", def: "A parietal groove involved in visual attention, number sense and hand–eye coordination.", x: 68, y: 26 },
  { group: "Sulci & fissures", name: "Superior temporal sulcus", def: "A temporal groove important for perceiving faces, voices, biological motion and social cues.", x: 55, y: 56 },
  { group: "Sulci & fissures", name: "Horizontal fissure of cerebellum", def: "The deep groove that divides the cerebellum's upper and lower surfaces.", x: 76, y: 70 },
  // Parietal lobe
  { group: "Parietal lobe", name: "Postcentral gyrus (primary somatosensory cortex)", def: "The ridge behind the central sulcus that receives touch, pain, temperature and position signals from the body.", x: 54, y: 16 },
  { group: "Parietal lobe", name: "Superior parietal lobule", def: "The upper parietal region that builds a map of the body in space and guides reaching.", x: 66, y: 12 },
  { group: "Parietal lobe", name: "Inferior parietal lobule", def: "The lower parietal region that integrates senses and supports language, maths and body image.", x: 68, y: 36 },
  { group: "Parietal lobe", name: "Supramarginal gyrus", def: "Wraps around the end of the Sylvian fissure and supports phonological processing, empathy and touch interpretation.", x: 63, y: 38 },
  { group: "Parietal lobe", name: "Angular gyrus", def: "A parietal ridge involved in reading, writing, arithmetic and connecting words with meaning.", x: 75, y: 34 },
  { group: "Parietal lobe", name: "Parietal operculum", def: "The part of the parietal lobe lining the Sylvian fissure that processes touch and taste-related signals.", x: 56, y: 40 },
  // Temporal lobe
  { group: "Temporal lobe", name: "Temporal pole", def: "The front tip of the temporal lobe linked to semantic memory, emotion and recognising familiar people.", x: 31, y: 63 },
  { group: "Temporal lobe", name: "Superior temporal gyrus", def: "The top temporal ridge containing the auditory cortex and part of Wernicke's area.", x: 48, y: 50 },
  { group: "Temporal lobe", name: "Transverse temporal gyrus (Heschl's, primary auditory cortex)", def: "The first cortical stop for sound, mapping pitch from low to high.", x: 52, y: 45 },
  { group: "Temporal lobe", name: "Wernicke's area", def: "A region at the back of the superior temporal gyrus essential for understanding speech and written language.", x: 70, y: 46 },
  { group: "Temporal lobe", name: "Middle temporal gyrus", def: "The middle temporal ridge involved in word meaning, distance perception and recognising known faces.", x: 48, y: 60 },
  { group: "Temporal lobe", name: "Inferior temporal gyrus", def: "The lowest temporal ridge that processes visual object recognition and colour.", x: 50, y: 68 },
  { group: "Temporal lobe", name: "Visual area MT/V5", def: "A region near the temporal–occipital junction that detects visual motion.", x: 80, y: 52 },
  // Occipital lobe
  { group: "Occipital lobe", name: "Occipital pole", def: "The back tip of the brain, where the central visual field is processed in fine detail.", x: 89, y: 50 },
  { group: "Occipital lobe", name: "Lateral occipital cortex", def: "Outer occipital region that recognises the shape of objects.", x: 85, y: 40 },
  { group: "Occipital lobe", name: "Primary visual cortex (V1)", def: "The first cortical area to receive visual input, detecting edges, orientation and contrast.", x: 88, y: 56 },
  { group: "Occipital lobe", name: "Preoccipital notch", def: "A small indentation on the lower edge marking the boundary between the temporal and occipital lobes.", x: 80, y: 60 },
  // Cerebellum
  { group: "Cerebellum", name: "Cerebellar hemisphere", def: "Each side of the cerebellum, coordinating skilled limb movements and motor learning.", x: 74, y: 76 },
  { group: "Cerebellum", name: "Anterior lobe of cerebellum", def: "The upper-front cerebellum that regulates muscle tone and posture.", x: 64, y: 66 },
  { group: "Cerebellum", name: "Posterior lobe of cerebellum", def: "The largest part of the cerebellum, coordinating fine movement and contributing to cognition.", x: 80, y: 72 },
  { group: "Cerebellum", name: "Flocculonodular lobe", def: "The small lower cerebellum part that controls balance and eye movements.", x: 62, y: 76 },
  { group: "Cerebellum", name: "Vermis", def: "The narrow midline of the cerebellum that controls posture, trunk and gait.", x: 84, y: 64 },
  // Brainstem
  { group: "Brainstem", name: "Midbrain", def: "The top of the brainstem controlling eye movement, hearing and visual reflexes, and motor control via the substantia nigra.", x: 52, y: 66 },
  { group: "Brainstem", name: "Pons", def: "A bulge of the brainstem relaying signals to the cerebellum and helping control breathing and sleep.", x: 55, y: 75 },
  { group: "Brainstem", name: "Medulla oblongata", def: "The lowest brainstem part controlling heartbeat, breathing, swallowing and blood pressure.", x: 61, y: 86 },
  { group: "Brainstem", name: "Spinal cord (start)", def: "The nerve bundle continuing from the medulla that carries signals between brain and body.", x: 64, y: 95 },
  { group: "Brainstem", name: "Cranial nerve roots", def: "Twelve pairs of nerves leaving the brain and brainstem to control the face, senses and vital organs.", x: 52, y: 80 },
  // Deep structures
  { group: "Deep structures", deep: true, name: "Insula", def: "A cortex hidden inside the Sylvian fissure that senses the body's internal state, taste, pain and emotion.", x: 42, y: 42 },
  { group: "Deep structures", deep: true, name: "Hippocampus", def: "A seahorse-shaped structure in the temporal lobe that forms new memories and supports navigation.", x: 50, y: 62 },
  { group: "Deep structures", deep: true, name: "Amygdala", def: "An almond-shaped nucleus that detects threats and drives fear and emotional learning.", x: 40, y: 60 },
  { group: "Deep structures", deep: true, name: "Thalamus", def: "The brain's central relay station sending sensory and motor signals to the cortex.", x: 52, y: 42 },
  { group: "Deep structures", deep: true, name: "Hypothalamus", def: "A small region controlling hormones, hunger, thirst, body temperature and sleep cycles.", x: 44, y: 54 },
  { group: "Deep structures", deep: true, name: "Pituitary gland", def: "The 'master gland' hanging below the hypothalamus that releases hormones controlling other glands.", x: 40, y: 64 },
  { group: "Deep structures", deep: true, name: "Pineal gland", def: "A tiny gland that secretes melatonin to regulate the sleep–wake cycle.", x: 62, y: 46 },
  { group: "Deep structures", deep: true, name: "Caudate nucleus", def: "Part of the basal ganglia involved in learning, memory and goal-directed behaviour.", x: 42, y: 32 },
  { group: "Deep structures", deep: true, name: "Putamen", def: "Part of the basal ganglia that regulates movement and some types of learning.", x: 44, y: 40 },
  { group: "Deep structures", deep: true, name: "Globus pallidus", def: "A basal ganglia nucleus that fine-tunes movement by inhibiting unwanted actions.", x: 46, y: 44 },
  { group: "Deep structures", deep: true, name: "Nucleus accumbens", def: "The brain's reward centre, linked to motivation, pleasure and addiction.", x: 36, y: 46 },
  { group: "Deep structures", deep: true, name: "Substantia nigra", def: "A midbrain nucleus producing dopamine for movement; its loss causes Parkinson's disease.", x: 52, y: 62 },
  { group: "Deep structures", deep: true, name: "Subthalamic nucleus", def: "A small basal ganglia nucleus that helps stop movements and is a target for deep brain stimulation.", x: 50, y: 52 },
  { group: "Deep structures", deep: true, name: "Corpus callosum", def: "The thick band of nerve fibres connecting the left and right hemispheres.", x: 52, y: 30 },
  { group: "Deep structures", deep: true, name: "Fornix", def: "An arching fibre tract carrying memory signals from the hippocampus to the hypothalamus.", x: 54, y: 38 },
  { group: "Deep structures", deep: true, name: "Cingulate gyrus", def: "A medial cortex wrapping the corpus callosum that handles emotion, pain and error monitoring.", x: 46, y: 24 },
  { group: "Deep structures", deep: true, name: "Lateral ventricles", def: "Fluid-filled cavities inside each hemisphere that produce and hold cerebrospinal fluid.", x: 54, y: 34 },
  { group: "Deep structures", deep: true, name: "Third ventricle", def: "A narrow midline cavity between the two thalami that carries cerebrospinal fluid.", x: 48, y: 48 },
  { group: "Deep structures", deep: true, name: "Fourth ventricle", def: "A cavity between the brainstem and cerebellum that passes cerebrospinal fluid to the spinal canal.", x: 62, y: 70 },
  { group: "Deep structures", deep: true, name: "Mammillary bodies", def: "Two small nuclei under the hypothalamus that relay memory signals.", x: 46, y: 58 },
  { group: "Deep structures", deep: true, name: "Olfactory bulb", def: "The structure under the frontal lobe that receives smell signals from the nose.", x: 20, y: 60 },
  { group: "Deep structures", deep: true, name: "Optic chiasm", def: "Where the optic nerves cross so each side of the brain sees the opposite visual field.", x: 36, y: 62 },
  { group: "Deep structures", deep: true, name: "Internal capsule", def: "A dense band of fibres carrying motor and sensory signals between the cortex and brainstem.", x: 48, y: 38 },
  { group: "Deep structures", deep: true, name: "Claustrum", def: "A thin sheet of neurons beneath the insula thought to coordinate attention and consciousness.", x: 40, y: 38 },
  { group: "Deep structures", deep: true, name: "Superior colliculus", def: "A midbrain structure that orients the eyes and head toward visual targets.", x: 58, y: 56 },
  { group: "Deep structures", deep: true, name: "Inferior colliculus", def: "A midbrain auditory relay that helps locate where sounds come from.", x: 60, y: 60 },
  { group: "Deep structures", deep: true, name: "Locus coeruleus", def: "A brainstem nucleus producing noradrenaline for arousal, alertness and stress responses.", x: 58, y: 70 },
  { group: "Deep structures", deep: true, name: "Reticular formation", def: "A network through the brainstem that controls wakefulness, sleep and consciousness.", x: 57, y: 78 },
  { group: "Deep structures", deep: true, name: "Red nucleus", def: "A midbrain nucleus involved in motor coordination, especially of the arms.", x: 54, y: 60 },
  { group: "Deep structures", deep: true, name: "Septal nuclei", def: "Nuclei in front of the third ventricle linked to pleasure, reward and memory.", x: 40, y: 48 },
  { group: "Deep structures", deep: true, name: "Entorhinal cortex", def: "The gateway to the hippocampus containing grid cells for spatial navigation; affected early in Alzheimer's.", x: 44, y: 66 },
  { group: "Deep structures", deep: true, name: "Parahippocampal gyrus", def: "Cortex around the hippocampus that helps recognise places and scenes.", x: 56, y: 68 },
  { group: "Deep structures", deep: true, name: "Fusiform gyrus", def: "An underside temporal-occipital ridge that recognises faces, words and objects.", x: 66, y: 66 },
  { group: "Deep structures", deep: true, name: "Precuneus", def: "A medial parietal region involved in self-reflection, memory recall and imagery.", x: 76, y: 20 },
  { group: "Deep structures", deep: true, name: "Cuneus", def: "A medial occipital wedge that processes basic visual information.", x: 86, y: 34 },
  { group: "Deep structures", deep: true, name: "Lingual gyrus", def: "A medial occipital ridge involved in visual memory, reading and dreaming.", x: 84, y: 60 },
  { group: "Deep structures", deep: true, name: "Calcarine sulcus", def: "The groove on the inner occipital surface where the primary visual cortex lies.", x: 88, y: 46 },
  { group: "Deep structures", deep: true, name: "Dentate nucleus", def: "The largest deep cerebellar nucleus that sends movement-planning signals to the thalamus.", x: 72, y: 70 },
];

export const SURFACE = REGIONS.filter((r) => !r.deep);

export function nearestSurface(x: number, y: number) {
  let best: Region | null = null, d = Infinity;
  for (const r of SURFACE) {
    const dd = Math.hypot((r.x - x) * 1.33, r.y - y);
    if (dd < d) { d = dd; best = r; }
  }
  return d < 16 ? best : null;
}
