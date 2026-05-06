/**
 * seed.ts — Insère des sources de test pour valider le chat
 * Usage : npx tsx seed.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SEED_SOURCES = [
  {
    title: "Discours de la Sorbonne — 25 avril 2024",
    content: "L'Europe est mortelle. Elle peut mourir. Ce n'est pas une certitude, c'est un choix. Mon choix, notre choix. Je veux une Europe puissance, souveraine, capable d'agir seule sur la scène mondiale. Cela suppose une autonomie stratégique en matière de défense. Nous devons investir massivement dans notre industrie de défense commune. Je propose un budget européen de défense et la création d'une académie militaire européenne. L'élargissement doit être conditionné à des réformes institutionnelles profondes.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2024/04/25/discours-d-emmanuel-macron-sur-l-europe",
    source_date: "2024-04-25",
    source_type: "discours",
    source_site: "elysee.fr",
  },
  {
    title: "Discours de la Sorbonne — 26 septembre 2017",
    content: "Je veux une Europe souveraine, unie et démocratique. Nous avons besoin d'une refondation profonde d'une Europe efficace, qui protège ses citoyens. Je propose de créer un Parquet européen, d'unifier nos marchés de capitaux, de créer une Académie du renseignement européen. L'Europe doit se doter d'une capacité d'intervention commune, d'un budget commun et d'un Parlement de la zone euro.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2017/09/26/initiative-pour-l-europe",
    source_date: "2017-09-26",
    source_type: "discours",
    source_site: "elysee.fr",
  },
  {
    title: "Allocution sur la réforme des retraites — 17 avril 2023",
    content: "La réforme des retraites est nécessaire pour garantir l'équilibre financier de notre système par répartition. Reporter l'âge légal de départ à 64 ans, c'est une décision difficile mais indispensable. Nous vivons plus longtemps, il faut travailler un peu plus longtemps. Nous avons prévu des mesures pour les carrières longues, pour la pénibilité, et nous revalorisations le minimum contributif à 1 200 euros. Je comprends la colère mais je n'ai pas le droit de laisser notre système de retraites aller dans le mur.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/04/17/adresse-aux-francais",
    source_date: "2023-04-17",
    source_type: "declaration",
    source_site: "elysee.fr",
  },
  {
    title: "Plan France 2030 — Octobre 2021",
    content: "France 2030, c'est le plan d'investissement le plus ambitieux que notre pays ait connu depuis des décennies. 30 milliards d'euros pour transformer nos secteurs industriels clés : énergie, automobile, santé, alimentation, culture et industries créatives. Nous voulons être les champions mondiaux de l'hydrogène vert, des petits réacteurs nucléaires modulaires, des véhicules électriques et hybrides. C'est notre pari sur l'avenir, c'est notre réponse à la désindustrialisation.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2021/10/12/france-2030",
    source_date: "2021-10-12",
    source_type: "discours",
    source_site: "elysee.fr",
  },
  {
    title: "Conseil de planification écologique — Septembre 2023",
    content: "La planification écologique est une priorité absolue de mon quinquennat. Nous nous fixons un objectif de réduction de 55% de nos émissions de gaz à effet de serre d'ici 2030. Pour y parvenir, nous sortons progressivement des chaudières à fioul, nous développons les énergies renouvelables et relançons le nucléaire avec les nouveaux EPR2. Ma conviction profonde : écologie et industrie ne sont pas antagonistes, ils sont complémentaires.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/09/25/conseil-de-planification-ecologique",
    source_date: "2023-09-25",
    source_type: "conference_presse",
    source_site: "elysee.fr",
  },
  {
    title: "Discours sur la souveraineté industrielle — Septembre 2022",
    content: "La France doit reconquérir sa souveraineté industrielle. Nous avons trop longtemps délocalisé, trop longtemps cédé à la mondialisation sans réciprocité. Avec France 2030, nous réindustrialisons notre pays. Nous avons attiré plus d'usines en France ces trois dernières années qu'au cours des dix années précédentes. Les semi-conducteurs, les batteries électriques, les médicaments essentiels : nous devons les produire sur notre sol.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2022/09/20/discours-souverainete-industrielle",
    source_date: "2022-09-20",
    source_type: "discours",
    source_site: "elysee.fr",
  },
  {
    title: "Conférence de presse — Réforme de l'éducation — Décembre 2023",
    content: "L'école de la République repose sur le mérite et l'égalité des chances. Nous rétablissons les groupes de niveaux en français et en mathématiques en 6ème et 5ème pour que chaque élève progresse au bon rythme. Nous renforçons les savoirs fondamentaux. La réforme du lycée professionnel permettra d'élever le niveau et d'assurer de meilleures perspectives d'insertion. Mon ambition : que chaque enfant, quel que soit son origine, puisse réussir.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/12/05/conference-presse-education",
    source_date: "2023-12-05",
    source_type: "conference_presse",
    source_site: "elysee.fr",
  },
  {
    title: "Allocution sur l'IA et la technologie — Février 2024",
    content: "La France et l'Europe doivent être aux avant-postes de l'intelligence artificielle. Nous avons lancé une stratégie nationale IA dotée d'un milliard d'euros. Nous avons des champions comme Mistral AI. L'IA doit être développée de manière éthique, avec des garde-fous, dans le respect de nos valeurs. L'acte européen sur l'IA, que nous avons porté pendant la présidence française, fixe un cadre mondial. La souveraineté technologique est une condition de notre souveraineté tout court.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2024/02/15/intelligence-artificielle",
    source_date: "2024-02-15",
    source_type: "discours",
    source_site: "elysee.fr",
  },
];

async function seed() {
  console.log(`\n🌱 Insertion de ${SEED_SOURCES.length} sources de test...\n`);

  const { data, error } = await supabase
    .from('president_sources')
    .insert(SEED_SOURCES)
    .select('id');

  if (error) {
    console.error('❌ Erreur:', error.message);
    console.error('→ Vérifie que la migration SQL a bien été exécutée dans Supabase.');
    process.exit(1);
  }

  console.log(`✅ ${data.length} sources insérées avec succès !\n`);
  console.log('Tu peux maintenant lancer le chat et tester des questions sur :');
  console.log('  • La réforme des retraites');
  console.log('  • La politique européenne');
  console.log('  • La transition écologique');
  console.log('  • La souveraineté industrielle');
  console.log('  • L\'IA et la technologie');
  console.log('  • L\'éducation');
}

seed();
