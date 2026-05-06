/**
 * seed2.ts — Sources supplémentaires pour enrichir la base
 * Usage : npx tsx seed2.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SOURCES = [
  // --- UKRAINE & DÉFENSE ---
  {
    title: "Conférence de soutien à l'Ukraine — Février 2024",
    content: "Nous soutenons l'Ukraine aussi longtemps qu'il le faudra. La victoire de la Russie serait une défaite pour l'Europe entière. J'ai dit clairement : nous n'excluons rien. Aucune option ne doit être écartée pour permettre à l'Ukraine de l'emporter sur le terrain. Nous avons fourni des armements, des blindés, nous formons leurs soldats. La France a pris ses responsabilités. La sécurité européenne ne peut reposer uniquement sur les États-Unis. C'est pourquoi je plaide pour une Europe de la défense crédible et autonome.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2024/02/26/conference-soutien-ukraine",
    source_date: "2024-02-26",
    source_type: "conference_presse",
    source_site: "elysee.fr",
  },
  {
    title: "Discours à l'Académie militaire de Saint-Cyr — Mars 2023",
    content: "Nous sommes entrés dans une ère nouvelle de conflictualité. Le retour de la guerre en Europe nous oblige à rehausser notre effort de défense. La Loi de Programmation Militaire 2024-2030 porte notre budget de défense à 413 milliards d'euros sur sept ans. C'est un effort inédit depuis des décennies. Nous investissons dans nos capacités nucléaires, nos drones, le cyber, le renseignement et l'espace. La dissuasion nucléaire reste le socle de notre défense nationale.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/03/13/discours-saint-cyr-lpm",
    source_date: "2023-03-13",
    source_type: "discours",
    source_site: "elysee.fr",
  },

  // --- IMMIGRATION ---
  {
    title: "Interview sur la loi Immigration — Décembre 2023",
    content: "La France doit garder la maîtrise de ses frontières et de ses flux migratoires. Nous devons être fermes sur l'immigration irrégulière et expulser ceux qui n'ont pas le droit d'être sur notre territoire. Dans le même temps, nous avons besoin d'immigration régulière pour nos secteurs en tension. La loi immigration permet de mieux réguler, d'expulser plus efficacement et de protéger les travailleurs étrangers qui contribuent à notre économie. Je ne cède ni à la facilité ni à la démagogie sur ce sujet.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/12/20/interview-loi-immigration",
    source_date: "2023-12-20",
    source_type: "interview",
    source_site: "elysee.fr",
  },

  // --- POUVOIR D'ACHAT / ÉCONOMIE ---
  {
    title: "Discours sur le pouvoir d'achat — Juillet 2022",
    content: "Face à l'inflation, nous avons agi avec une protection sans précédent. Le bouclier tarifaire sur l'énergie a représenté 45 milliards d'euros pour protéger les Français. Nous avons revu le barème du prêt à taux zéro, revalorisé les retraites et les allocations. Je veux une économie qui protège mais qui ne crée pas d'assistanat. Mon cap : le plein emploi. Nous sommes passés de 10% à 7% de chômage en cinq ans. Nous allons continuer à créer les conditions d'un travail qui paie mieux.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2022/07/14/discours-pouvoir-achat",
    source_date: "2022-07-14",
    source_type: "discours",
    source_site: "elysee.fr",
  },
  {
    title: "Conférence de presse sur la situation économique — Janvier 2024",
    content: "La France est la première destination des investissements étrangers en Europe pour la cinquième année consécutive. Nous avons recréé 500 000 emplois industriels depuis 2017. Notre taux de chômage est au plus bas depuis 40 ans. Nous devons maintenant réduire notre déficit public et revenir sous 3% en 2027. Je refuse de choisir entre la compétitivité et la protection sociale. Notre modèle, c'est une économie productive et un État social fort.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2024/01/16/conference-economique",
    source_date: "2024-01-16",
    source_type: "conference_presse",
    source_site: "elysee.fr",
  },

  // --- NUCLÉAIRE ---
  {
    title: "Annonce du plan nucléaire — Belfort, Février 2022",
    content: "Je veux relancer la construction de réacteurs nucléaires en France. Nous allons construire six nouveaux réacteurs EPR2, et étudier la construction de huit réacteurs supplémentaires. Dans le même temps, nous prolongeons la durée de vie de nos centrales existantes. Le nucléaire est une énergie bas-carbone, fiable et souveraine. C'est indispensable pour atteindre nos objectifs climatiques et assurer notre indépendance énergétique. Arrêter le nucléaire aurait été une erreur historique.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2022/02/10/discours-belfort-nucleaire",
    source_date: "2022-02-10",
    source_type: "discours",
    source_site: "elysee.fr",
  },

  // --- SANTÉ ---
  {
    title: "Plan santé — Présentation du plan Ma Santé 2022",
    content: "Notre système de santé est l'un des meilleurs au monde mais il est fragilisé. Les déserts médicaux, les urgences sous tension, le manque de médecins dans certains territoires : je veux y remédier. Nous supprimons le numerus clausus pour former plus de médecins. Nous créons 4 000 maisons de santé. Nous développons la télémédecine. Mon objectif : garantir l'accès à un médecin traitant pour chaque Français d'ici 2027. La santé est un droit fondamental que je veux protéger.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2018/09/18/ma-sante-2022",
    source_date: "2018-09-18",
    source_type: "discours",
    source_site: "elysee.fr",
  },
  {
    title: "Allocution COVID-19 — Mars 2020",
    content: "Nous sommes en guerre, en guerre sanitaire certes, mais en guerre. L'ennemi est là, invisible, insaisissable, qui progresse. Et cela requiert notre mobilisation générale. Je prendrai dans les prochains jours des décisions complémentaires pour que notre pays puisse traverser cette crise. Personne ne sera laissé sans revenus face à l'arrêt d'activité. Toutes les entreprises qui le souhaitent peuvent bénéficier du chômage partiel. Nous protégerons nos salariés et nos entreprises coûte que coûte.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2020/03/16/adresse-aux-francais-covid19",
    source_date: "2020-03-16",
    source_type: "declaration",
    source_site: "elysee.fr",
  },

  // --- AGRICULTURE ---
  {
    title: "Discours au Salon de l'Agriculture — Février 2024",
    content: "Les agriculteurs français nourrissent la France et protègent nos paysages. Je veux qu'ils vivent dignement de leur travail. Le revenu des agriculteurs doit être garanti par la loi Egalim que nous renforçons. Nous simplifions les normes, nous allégerons la charge administrative. Je suis pour une agriculture souveraine, compétitive et durable. Nous ne pouvons pas demander à nos agriculteurs de respecter des standards environnementaux élevés et importer des produits qui ne les respectent pas. La réciprocité des normes est une priorité dans nos négociations commerciales européennes.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2024/02/24/salon-agriculture-2024",
    source_date: "2024-02-24",
    source_type: "discours",
    source_site: "elysee.fr",
  },

  // --- JEUNESSE / SERVICE NATIONAL ---
  {
    title: "Lancement du Service National Universel — Juin 2019",
    content: "Le Service National Universel s'adresse à toute une génération de jeunes Français. Il vise à renforcer la cohésion nationale, à transmettre les valeurs républicaines et à permettre à chaque jeune de s'engager pour le collectif. Les premières cohortes ont montré que des jeunes de tous horizons, de toutes origines, peuvent se retrouver et partager quelque chose d'essentiel : l'amour de la France. Je veux que ce service devienne universel et obligatoire progressivement.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2019/06/16/snu-lancement",
    source_date: "2019-06-16",
    source_type: "discours",
    source_site: "elysee.fr",
  },

  // --- LAÏCITÉ / RÉPUBLICANISME ---
  {
    title: "Discours sur le séparatisme et la laïcité — Octobre 2020",
    content: "La laïcité n'est pas une opinion parmi d'autres, c'est ce qui permet à toutes les opinions de coexister. L'islamisme radical veut soumettre des Français à des règles contraires à nos lois. Nous ne le laisserons pas faire. Nous allons dissoudre les associations qui propagent la haine. Nous fermerons les écoles hors contrat qui endoctrinent. Je défendrai la liberté de conscience, le droit au blasphème, l'égalité homme-femme. La République ne reculera pas.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2020/10/02/discours-separatisme-laicite",
    source_date: "2020-10-02",
    source_type: "discours",
    source_site: "elysee.fr",
  },

  // --- LOGEMENT ---
  {
    title: "Plan Logement — Novembre 2023",
    content: "La crise du logement est une réalité que je prends à bras le corps. Nous devons construire plus, rénover massivement et mieux réguler. Le dispositif MaPrimeRénov' a permis 700 000 rénovations en 2022. Nous accélérons la construction de logements sociaux dans les zones tendues. Je veux faciliter la transformation de bureaux vacants en logements. L'objectif est de produire 400 000 logements par an, dont 250 000 sociaux. Le droit au logement décent est une priorité républicaine.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/11/05/plan-logement",
    source_date: "2023-11-05",
    source_type: "conference_presse",
    source_site: "elysee.fr",
  },

  // --- POLICE / SÉCURITÉ ---
  {
    title: "Discours sur la sécurité après les émeutes — Juillet 2023",
    content: "La République, c'est la liberté mais c'est aussi l'ordre. Les violences que nous avons connues sont inexcusables. Les forces de l'ordre ont fait preuve d'un professionnalisme remarquable. Nous renforçons les effectifs de police dans les quartiers sensibles. J'ai demandé au gouvernement de revoir la politique des peines pour les mineurs délinquants. Les parents ont des responsabilités. La réponse c'est l'autorité, l'ordre républicain et l'égalité des chances pour que chaque jeune trouve sa place dans la société.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/07/03/discours-securite-emeutes",
    source_date: "2023-07-03",
    source_type: "declaration",
    source_site: "elysee.fr",
  },

  // --- EUROPE / FRONTEX ---
  {
    title: "Sommet européen de Versailles — Mars 2022",
    content: "La guerre en Ukraine a tout changé. Elle rappelle que la liberté a un prix et que la sécurité collective n'est pas acquise. Nous avons décidé à Versailles d'accélérer notre autonomie stratégique européenne : réduction de nos dépendances énergétiques, renforcement de notre base industrielle de défense, et investissements massifs dans les technologies critiques. Je veux une boussole stratégique européenne ambitieuse et des Européens capables d'agir ensemble, sans attendre.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2022/03/11/sommet-versailles",
    source_date: "2022-03-11",
    source_type: "conference_presse",
    source_site: "elysee.fr",
  },

  // --- SERVICES PUBLICS / ÉTAT ---
  {
    title: "Discours de clôture du Grand Débat National — Avril 2019",
    content: "Le Grand Débat a montré que les Français veulent un État plus proche, plus efficace et moins coûteux. Ils veulent moins d'impôts mais de meilleurs services. J'entends ce message. Nous allons baisser l'impôt sur le revenu, supprimer la taxe d'habitation pour tous. Mais je veux aussi transformer l'État : réduire le mille-feuille territorial, rapprocher les services publics des citoyens dans les territoires ruraux, renforcer la démocratie locale. Les Français veulent être entendus, pas seulement tous les cinq ans.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2019/04/25/cloture-grand-debat-national",
    source_date: "2019-04-25",
    source_type: "discours",
    source_site: "elysee.fr",
  },
];

async function seed() {
  console.log(`\n🌱 Insertion de ${SOURCES.length} nouvelles sources...\n`);

  const { data, error } = await supabase
    .from('president_sources')
    .insert(SOURCES)
    .select('id');

  if (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${data.length} sources insérées !\n`);
  console.log('Nouveaux sujets couverts :');
  console.log('  • Ukraine & défense européenne');
  console.log('  • Immigration');
  console.log('  • Pouvoir d\'achat & économie');
  console.log('  • Nucléaire (plan Belfort)');
  console.log('  • Santé & COVID');
  console.log('  • Agriculture');
  console.log('  • Laïcité & séparatisme');
  console.log('  • Logement');
  console.log('  • Sécurité & police');
  console.log('  • Jeunesse & SNU');
  console.log('  • Grand Débat National');
}

seed();
