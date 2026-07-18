export type Candidate = {
  id: string;
  name: string;
  aliases: string[];
};

export const candidates: Candidate[] = [
  { id: "albert-einstein", name: "アルベルト・アインシュタイン", aliases: ["アインシュタイン", "Albert Einstein"] },
  { id: "marie-curie", name: "マリー・キュリー", aliases: ["キュリー夫人", "Marie Curie"] },
  { id: "leonardo-da-vinci", name: "レオナルド・ダ・ヴィンチ", aliases: ["レオナルドダヴィンチ", "Leonardo da Vinci"] },
  { id: "william-shakespeare", name: "ウィリアム・シェイクスピア", aliases: ["シェイクスピア", "William Shakespeare"] },
  { id: "vincent-van-gogh", name: "フィンセント・ファン・ゴッホ", aliases: ["ゴッホ", "Vincent van Gogh"] },
  { id: "pablo-picasso", name: "パブロ・ピカソ", aliases: ["ピカソ", "Pablo Picasso"] },
  { id: "charlie-chaplin", name: "チャールズ・チャップリン", aliases: ["チャップリン", "Charlie Chaplin"] },
  { id: "michael-jackson", name: "マイケル・ジャクソン", aliases: ["Michael Jackson"] },
  { id: "taylor-swift", name: "テイラー・スウィフト", aliases: ["Taylor Swift"] },
  { id: "steve-jobs", name: "スティーブ・ジョブズ", aliases: ["スティーブジョブズ", "Steve Jobs"] },
  { id: "bill-gates", name: "ビル・ゲイツ", aliases: ["ビルゲイツ", "Bill Gates"] },
  { id: "elon-musk", name: "イーロン・マスク", aliases: ["イーロンマスク", "Elon Musk"] },
  { id: "barack-obama", name: "バラク・オバマ", aliases: ["オバマ", "Barack Obama"] },
  { id: "nelson-mandela", name: "ネルソン・マンデラ", aliases: ["マンデラ", "Nelson Mandela"] },
  { id: "martin-luther-king-jr", name: "マーティン・ルーサー・キング・ジュニア", aliases: ["キング牧師", "Martin Luther King"] },
  { id: "cleopatra", name: "クレオパトラ", aliases: ["クレオパトラ7世", "Cleopatra"] },
  { id: "napoleon-bonaparte", name: "ナポレオン・ボナパルト", aliases: ["ナポレオン", "Napoleon"] },
  { id: "julius-caesar", name: "ユリウス・カエサル", aliases: ["カエサル", "Julius Caesar"] },
  { id: "oda-nobunaga", name: "織田信長", aliases: ["おだのぶなが", "Oda Nobunaga"] },
  { id: "sakamoto-ryoma", name: "坂本龍馬", aliases: ["さかもとりょうま", "Sakamoto Ryoma"] },
  { id: "hatsune-miku", name: "初音ミク", aliases: ["はつねみく", "Hatsune Miku"] },
  { id: "ichiro", name: "イチロー", aliases: ["鈴木一朗", "Ichiro"] },
  { id: "naomi-osaka", name: "大坂なおみ", aliases: ["おおさかなおみ", "Naomi Osaka"] },
  { id: "hayao-miyazaki", name: "宮崎駿", aliases: ["みやざきはやお", "Hayao Miyazaki"] },
];

export function getCandidate(id: string): Candidate | undefined {
  return candidates.find((candidate) => candidate.id === id);
}

export function normalizeName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/[\s・._-]/g, "");
}

export function isCorrectGuess(candidate: Candidate, guess: string): boolean {
  const normalizedGuess = normalizeName(guess);
  return [candidate.name, ...candidate.aliases].some(
    (name) => normalizeName(name) === normalizedGuess,
  );
}
