/**
 * seed4.ts — Sources Assemblée Nationale et Débats Parlementaires
 * Usage : npx tsx seed4.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PARLIAMENT_SOURCES = [
  {
    title: "Assemblée Nationale — Déclaration de politique générale et cap législatif",
    content: "Le Parlement est le cœur battant de notre démocratie. Face aux défis économiques et géopolitiques, nous devons construire des majorités de projet texte par texte. Le compromis républicain n'est pas une faiblesse, c'est une exigence. J'appelle l'ensemble des forces républicaines de l'Assemblée nationale à la responsabilité pour voter les textes essentiels : pouvoir d'achat, plein emploi, souveraineté énergétique et réarmement régalien.",
    source_url: "https://www.assemblee-nationale.fr/dyn/actualites/declaration-politique-generale",
    source_date: "2024-01-30",
    source_type: "declaration",
    source_site: "assemblee-nationale.fr",
  },
  {
    title: "Assemblée Nationale — Adoption du projet de loi de programmation militaire 2024-2030",
    content: "L'Assemblée nationale a voté à une large majorité la Loi de Programmation Militaire (LPM) 2024-2030. Cet effort sans précédent de 413 milliards d'euros modernise nos armées, renforce notre dissuasion nucléaire, consolide nos capacités de cybersécurité, de renseignement et de défense sol-air. C'est la garantie de notre indépendance nationale et du respect de nos engagements européens.",
    source_url: "https://www.assemblee-nationale.fr/dyn/dossiers-legislatifs/programmation-militaire-2024-2030",
    source_date: "2023-07-13",
    source_type: "declaration",
    source_site: "assemblee-nationale.fr",
  },
  {
    title: "Assemblée Nationale — Débat sur la souveraineté énergétique et la relance du nucléaire",
    content: "Le vote du projet de loi relatif à l'accélération des procédures liées à la construction de nouvelles installations nucléaires à proximité de sites nucléaires existants marque un tournant stratégique. L'Assemblée nationale a soutenu la construction de six nouveaux réacteurs EPR2. Cette loi réduit les délais administratifs tout en garantissant le plus haut niveau de sûreté nucléaire et d'exigence environnementale.",
    source_url: "https://www.assemblee-nationale.fr/dyn/dossiers-legislatifs/acceleration-nucleaire",
    source_date: "2023-05-16",
    source_type: "declaration",
    source_site: "assemblee-nationale.fr",
  },
  {
    title: "Assemblée Nationale — Vote de la loi Industrie Verte et attractivité",
    content: "La loi relative à l'industrie verte votée par l'Assemblée nationale vise à faire de la France le leader des technologies propres en Europe. Elle permet d'accélérer les implantations industrielles décarbonées (batteries, pompes à chaleur, hydrogène vert, éolien, solaire), de former aux métiers d'avenir et de mobiliser l'épargne privée vers le financement de la transition écologique.",
    source_url: "https://www.assemblee-nationale.fr/dyn/dossiers-legislatifs/industrie-verte",
    source_date: "2023-10-11",
    source_type: "declaration",
    source_site: "assemblee-nationale.fr",
  },
  {
    title: "Assemblée Nationale — Examen du projet de loi de finances et maîtrise de la dette",
    content: "La trajectoire budgétaire examinée par la commission des finances de l'Assemblée nationale vise à ramener le déficit public sous les 3% du PIB d'ici 2027. Cela passe par la fin des boucliers tarifaires exceptionnels, une revue des dépenses publiques et le maintien d'une politique de l'offre favorisant l'investissement, la création d'emplois et l'activité économique sans hausse généralisée des impôts.",
    source_url: "https://www.assemblee-nationale.fr/dyn/dossiers-legislatifs/projet-loi-finances",
    source_date: "2023-11-20",
    source_type: "declaration",
    source_site: "assemblee-nationale.fr",
  },
  {
    title: "Assemblée Nationale — Débat sur l'autonomie stratégique et l'aide à l'Ukraine",
    content: "Lors du débat à l'Assemblée nationale en application de l'article 50-1 de la Constitution sur l'accord de sécurité franco-ukrainien, la représentation nationale a débattu des engagements bilatéraux de la France. La France réaffirme son soutien indéfectible face à l'agression russe pour garantir la sécurité et la stabilité durable du continent européen.",
    source_url: "https://www.assemblee-nationale.fr/dyn/actualites/debat-accord-securite-ukraine",
    source_date: "2024-03-12",
    source_type: "debat",
    source_site: "assemblee-nationale.fr",
  },
];

async function seedParliament() {
  console.log(`\n🏛️ Insertion de ${PARLIAMENT_SOURCES.length} sources Assemblée Nationale...\n`);

  const { data, error } = await supabase
    .from('president_sources')
    .insert(PARLIAMENT_SOURCES)
    .select('id');

  if (error) {
    console.error('❌ Erreur insertion :', error.message);
    process.exit(1);
  }

  console.log(`✅ ${data.length} sources Assemblée Nationale insérées avec succès !`);
}

seedParliament();
