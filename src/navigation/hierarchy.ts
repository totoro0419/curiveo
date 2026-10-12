import { catalog, videoSubjects, seriesInSubject, seriesMap, unitMap, videoMap } from "../catalog";
import type { Series, SubjectId, Unit, Video } from "../types";

export interface LearningNode {
  id: string;
  subjectId: SubjectId;
  parentId?: string;
  title: string;
  description: string;
  kind: "subject" | "level" | "field" | "unit" | "topic";
  children: string[];
  videoIds: string[];
  targets?: { videoId: string; startSeconds: number; title: string }[];
  evidence: string;
  sourceUnitIds: string[];
}

/** These are navigation references. Canonical video IDs and study records stay unchanged. */
export const learningNodes = new Map<string, LearningNode>();
export const hierarchyRoots = {} as Record<SubjectId, string>;
const ownVideos = new Map<string, Set<string>>();
const videoLeaves = new Map<string, string[]>();
const keyedNodes = new Map<string, string>();
const unitOrder = new Map(catalog.units.map((u, i) => [u.id, u.order * 1000 + i]));
const videoOrder = new Map(catalog.videos.map((v, i) => [v.id, i]));
const sourceRank = new Map<string, number>();
const sourceEvidence = "登録済みカタログの公式目次・元単元名・動画タイトルに基づく案内分類。動画内容の詳細や難易度を評価した分類ではありません。";

function norm(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function hash(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}

function child(parent: LearningNode, title: string, kind: LearningNode["kind"], evidence = sourceEvidence) {
  const key = `${parent.id}|${kind}|${norm(title)}`;
  const known = keyedNodes.get(key);
  if (known) return learningNodes.get(known)!;
  const id = `learn-${parent.subjectId}-${hash(key)}`;
  if (learningNodes.has(id)) throw new Error(`Learning hierarchy ID collision: ${id}`);
  const node: LearningNode = {
    id, subjectId: parent.subjectId, parentId: parent.id, title,
    description: kind === "topic" ? "この学習項目の授業" : `${title}の授業を学習項目から探す`,
    kind, children: [], videoIds: [], evidence, sourceUnitIds: [],
  };
  learningNodes.set(id, node);
  keyedNodes.set(key, id);
  ownVideos.set(id, new Set());
  parent.children.push(id);
  return node;
}

function attach(node: LearningNode, video: Video, sourceUnits: Unit[]) {
  ownVideos.get(node.id)!.add(video.id);
  for (const unit of sourceUnits) {
    if (!node.sourceUnitIds.includes(unit.id)) node.sourceUnitIds.push(unit.id);
    sourceRank.set(node.id, Math.min(sourceRank.get(node.id) ?? Infinity, unitOrder.get(unit.id) ?? Infinity));
  }
  const leaves = videoLeaves.get(video.id) ?? [];
  if (!leaves.includes(node.id)) leaves.push(node.id);
  videoLeaves.set(video.id, leaves);
}

for (const subject of catalog.subjects) {
  const id = `subject-${subject.id}`;
  hierarchyRoots[subject.id] = id;
  learningNodes.set(id, {
    id, subjectId: subject.id, title: subject.name, description: subject.description,
    kind: "subject", children: [], videoIds: [], evidence: sourceEvidence, sourceUnitIds: [],
  });
  ownVideos.set(id, new Set());
}

function root(subjectId: SubjectId) { return learningNodes.get(hierarchyRoots[subjectId])!; }
function sources(video: Video) { return video.unitIds.map(id => unitMap.get(id)).filter((u): u is Unit => !!u && u.subjectId === video.subjectId); }
function unknown(video: Video, units: Unit[]) { attach(child(root(video.subjectId), "その他・分類確認中", "unit"), video, units); }

/** Remove only visible numbering and series labels, preserving the title's actual learning item. */
function lessonTitle(title: string) {
  const withoutParts = title.replace(/[①②③④⑤⑥⑦⑧⑨⑩❶❷❸❹❺]/g, "");
  return norm(withoutParts)
    .replace(/^.*?【第\s*\d+\s*講】\s*/, "")
    .replace(/^(?:【[^】]*】\s*)+/, "")
    .split("【")[0]
    .replace(/(?:その\s*\d+|[#＃]\s*\d+|\/全\s*\d+\s*(?:回|講)).*$/, "")
    .replace(/\s*[（(]\s*\d+\s*[）)]\s*$/, "")
    .replace(/[＊*]+$/, "")
    .trim();
}

const mathLevels = ["数学Ⅰ", "数学A", "数学Ⅱ", "数学B", "数学Ⅲ", "数学C", "中学数学", "総復習・入試"];
const mathLevelNodes = new Map(mathLevels.map(title => [title, child(root("mathematics"), title, "level")]));
const mathAliases: Record<string, string> = {
  "2次関数": "二次関数", "二次関数": "二次関数", "y=ax2(2次関数)": "二次関数",
  "1次関数": "一次関数", "2次方程式": "二次方程式", "2次不等式": "二次不等式",
  "実数・1次不等式": "実数・一次不等式", "整数": "整数の性質", "数列・漸化式": "数列",
};
function mathName(name: string) {
  const n = norm(name).replace("y=ax²", "y=ax2");
  return mathAliases[n] ?? n;
}
const mathAnchors = new Map<string, Set<string>>();
for (const u of catalog.units.filter(u => u.subjectId === "mathematics" && mathLevels.includes(u.level) && u.level !== "総復習・入試")) {
  const levels = mathAnchors.get(mathName(u.name)) ?? new Set<string>();
  levels.add(u.level); mathAnchors.set(mathName(u.name), levels);
}
function titleMathLevel(title: string) {
  const m = norm(title).match(/数(?:学)?\s*(III|II|I|[123ABC])/i);
  if (!m) return undefined;
  return ({ I: "数学Ⅰ", II: "数学Ⅱ", III: "数学Ⅲ", "1": "数学Ⅰ", "2": "数学Ⅱ", "3": "数学Ⅲ", A: "数学A", B: "数学B", C: "数学C" } as Record<string, string>)[m[1].toUpperCase()];
}
function mathField(name: string) {
  if (/微分|積分/.test(name)) return "微分・積分";
  if (/極限/.test(name)) return "極限";
  if (/数列/.test(name)) return "数列";
  if (/ベクトル|複素数平面|式と曲線|図形と方程式|軌跡・領域/.test(name)) return "図形と座標";
  if (/三角比|図形の性質|平面図形|空間図形/.test(name)) return "図形";
  if (/場合の数|確率/.test(name)) return "場合の数・確率";
  if (/データ|統計/.test(name)) return "データ・統計";
  if (/関数|比例/.test(name)) return "関数";
  if (/総復習|数学総合/.test(name)) return "総復習";
  return "数と式・論理";
}
function addMath(video: Video, units: Unit[]) {
  for (const source of units) {
    let name = mathName(source.name);
    const explicit = titleMathLevel(video.title);
    let level = mathLevels.includes(source.level) ? source.level : explicit;
    if (name === "微分・積分" && /積分/.test(video.title) && !/微分/.test(video.title)) name = "積分法";
    const anchors = mathAnchors.get(name);
    if (!level && anchors?.size === 1) level = [...anchors][0];
    level ??= "総復習・入試";
    const course = mathLevelNodes.get(level)!;
    const field = mathField(name);
    const parent = field === name ? course : child(course, field, "field");
    attach(child(parent, name, "unit", `${sourceEvidence} 科目は元単元の明示区分、動画名の科目表記、または既存の同名単元の一意な区分を使用。科目を確定できない補強授業は総復習・入試に保持。`), video, [source]);
  }
}

const grammarNames = ["時制", "仮定法", "比較", "受動態", "分詞", "関係詞", "助動詞", "前置詞", "不定詞・動名詞", "倒置・強調", "否定", "文型", "動詞の語法", "英文法総合"];
function addEnglish(video: Video, units: Unit[]) {
  const names = units.map(u => norm(u.name));
  const text = norm(video.title);
  let section = "英文法", theme = names.find(n => grammarNames.includes(n));
  const mixed = !theme || theme === "英文法総合";
  if (mixed && /英作文|英訳|英作/.test(text)) { section = "英作文"; theme = /自由英作文/.test(text) ? "自由英作文" : "和文英訳・英作文"; }
  else if (mixed && (/長文|英文解釈|英文和訳|難解構文.*和訳/.test(text) || names.includes("英文読解"))) { section = "長文・英文解釈"; theme = /英文解釈|和訳/.test(text) ? "英文解釈・和訳" : "長文読解"; }
  else if (mixed && names.includes("和訳・英訳・英作文")) { section = "英作文"; theme = "和文英訳・英作文"; }
  else if (!theme && /単語|本のオススメ/.test(text)) { section = "語彙・学習法"; theme = /単語/.test(text) ? "語彙" : "学習法"; }
  else if (!theme) { theme = /他動詞|自動詞/.test(text) ? "動詞の語法" : "英文法総合"; }
  // A source's explicit theme takes precedence over promotional words in the video title.
  attach(child(child(root("english"), section, "field"), theme!, "unit"), video, units);
}

type TopicRule = readonly [RegExp, string, string?];
const physicsRules: TopicRule[] = [
  [/全部解説|総復習/, "分野の総復習"],
  [/運動方程式|重畳.*物体/, "運動の法則", "運動方程式"],
  [/作用反作用|つり合い/, "運動の法則", "作用・反作用と力のつり合い"],
  [/運動の法則/, "運動の法則"],
  [/水圧|浮力|圧力/, "力とつり合い", "圧力と浮力"],
  [/モーメント/, "力とつり合い", "力のモーメント"],
  [/力の種類/, "力とつり合い", "力の種類"],
  [/重心速度/, "運動量と保存則", "重心速度"],
  [/重心/, "力とつり合い", "重心"],
  [/仕事|エネルギー保存/, "仕事とエネルギー"],
  [/摩擦力/, "力とつり合い", "摩擦力"],
  [/運動量|力積|保存則/, "運動量と保存則"],
  [/速度|変位|加速度|v-t|ｖ-ｔ/, "運動の表し方"],
  [/落体|放物|反発係数/, "落体・放物運動"],
  [/円運動|慣性力/, "円運動・慣性力"],
  [/万有引力|ケプラー/, "万有引力"],
  [/単振動/, "単振動"],
  [/シュワルツシルト|ブラックホール/, "発展的な補強講義"],
  [/比熱|熱容量|熱量保存/, "熱と熱量"],
  [/状態方程式|気体分子運動論/, "気体の性質"],
  [/熱力学|内部エネルギー|マイヤー/, "熱力学の法則"],
  [/定積|定圧|等温|断熱|気体の混合|熱効率/, "気体の状態変化と熱機関"],
  [/ドップラー/, "音波", "ドップラー効果"],
  [/うなり|気柱|弦/, "音波"],
  [/レンズ|球面鏡|凸面鏡/, "光", "レンズと鏡"],
  [/光の干渉/, "光", "光の干渉"],
  [/光$/, "光"],
  [/波|媒質|反射|屈折|回折|干渉/, "波の基本性質"],
  [/コンデンサー|合成容量/, "コンデンサー"],
  [/クーロン|電場|電位|ガウス|荷電粒子/, "電場と電位"],
  [/オーム|抵抗|キルヒ|電流計|電圧計|ブリッジ|電位差計|電流.*電圧/, "直流回路"],
  [/電磁誘導|誘導起電力|誘電起電力|自己誘導|相互誘導|過渡現象/, "電磁誘導"],
  [/磁場|ローレンツ|電磁力/, "電流と磁場"],
  [/交流|電気振動/, "交流・電気振動"],
  [/光電|コンプトン|X線|ブラッグ/, "光と電子"],
  [/ボーア/, "原子の構造"],
  [/放射|半減期|質量欠損|結合エネルギー|核反応|核エネルギー/, "原子核"],
];
function addPhysics(video: Video, units: Unit[]) {
  const fieldName = units[0]?.name;
  if (!fieldName) return unknown(video, units);
  const field = child(root("physics"), fieldName, "field");
  const title = lessonTitle(video.title);
  const rule = physicsRules.find(([pattern]) => pattern.test(norm(title)));
  const unit = child(field, rule?.[1] ?? "その他・分類確認中", "unit");
  const theme = rule?.[2];
  const target = theme && theme !== unit.title ? child(unit, theme, "topic") : unit;
  attach(target, video, units);
}

const chemistryFields: Record<string, string> = {
  "物質の探求": "物質の構成", "物質の構成粒子": "物質の構成", "化学結合": "物質の構成",
  "物質量mol": "物質量と化学反応", "化学反応式": "物質量と化学反応", "酸と塩基": "化学反応と平衡",
  "酸化還元｜電池・電気分解": "化学反応と平衡", "固体の構造": "物質の状態", "気体の性質": "物質の状態",
  "溶液の性質": "物質の状態", "反応熱": "化学反応と平衡", "反応速度": "化学反応と平衡", "化学平衡": "化学反応と平衡",
};
function addChemistry(video: Video, units: Unit[]) {
  const original = units[0]?.name ?? "";
  let unitName = original, fieldName = chemistryFields[original];
  if (!fieldName) {
    const title = norm(video.title);
    if (/無機化学|ハロゲン|硫黄|窒素|アルカリ金属|2族|両性元素|鉄・銅・銀|系統分離|気体の製法/.test(title)) { fieldName = "無機化学"; unitName = /重要反応式|反応/.test(title) ? "無機化学の反応式" : /元素|金属|硫黄|窒素|鉄・銅・銀/.test(title) ? "元素とその化合物" : "無機化学の整理"; }
    else if (/高分子|アミノ酸|タンパク質/.test(title)) { fieldName = "高分子化合物"; unitName = /合成/.test(title) ? "合成高分子" : /天然|アミノ酸|タンパク質/.test(title) ? "天然高分子" : "高分子の整理"; }
    else if (/有機化学|炭化水素|脂肪族|油脂|セッケン|フェノール|カルボン酸|芳香族|構造決定/.test(title)) { fieldName = "有機化学"; unitName = /芳香族|フェノール/.test(title) ? "芳香族化合物" : /構造決定/.test(title) ? "構造決定" : "有機化合物"; }
    else if (/日常/.test(original) || /日常の化学/.test(title)) { fieldName = "日常の化学"; unitName = "日常の現象"; }
    else { fieldName = "その他・分類確認中"; }
  }
  attach(child(child(root("chemistry"), fieldName, "field"), unitName || "分類確認中", "unit"), video, units);
}

function historyField(subject: SubjectId, chapter: number) {
  if (subject === "japanese-history") {
    if (chapter <= 5) return "縄文・弥生〜平安中期";
    if (chapter <= 9) return "平安後期〜安土桃山";
    if (chapter <= 12) return "江戸時代";
    if (chapter <= 16) return "幕末・明治・大正";
    if (chapter <= 19) return "昭和・平成";
    return "近現代の文化";
  }
  if (chapter <= 3) return "古代文明・地中海世界";
  if (chapter <= 8) return "アジア・イスラーム世界";
  if (chapter <= 10) return "中世ヨーロッパ";
  if (chapter <= 12) return "近世ヨーロッパ";
  if (chapter <= 16) return "近現代の欧米";
  if (chapter <= 19) return "近現代のアジア";
  return "戦後の世界";
}
function addHistory(video: Video, units: Unit[]) {
  for (const source of units) {
    const number = Number(norm(source.name).match(/第\s*(\d+)\s*話/)?.[1]);
    if (!number) { unknown(video, [source]); continue; }
    const field = child(root(video.subjectId), historyField(video.subjectId, number), "field", "Historia Mundi公式授業目次の章名と第1〜20話の順序に基づく時代・地域別の入口。現行課程との一致は未確認。");
    const onlyChapter = (video.subjectId === "world-history" && number === 20) || (video.subjectId === "japanese-history" && number === 20);
    attach(onlyChapter ? field : child(field, source.name, "unit", "元単元に保存されたHistoria Mundi公式目次の章名・章順を維持。"), video, [source]);
  }
}

function addJapanese(video: Video, units: Unit[]) {
  const fieldName = units[0]?.name;
  if (!fieldName) return unknown(video, units);
  const field = child(root("japanese"), fieldName, "field");
  const series = video.seriesIds.map(id => seriesMap.get(id)).filter((s): s is Series => !!s && s.subjectId === "japanese");
  if (!series.length) return attach(child(field, "その他・分類確認中", "unit"), video, units);
  for (const source of series) {
    const title = source.title.replace(/^(?:【現代文】|現代文)\s*/, "");
    attach(child(field, title, "unit", `ただよび公式講座名「${source.title}」を学習テーマの入口として使用。出典: ${source.sourceUrl}`), video, units);
  }
}

const informationFields = ["情報社会の問題解決", "コミュニケーションと情報デザイン", "コンピュータとプログラミング", "情報通信ネットワークとデータの活用"];
const infoCourse = root("information").title === "情報Ⅰ" ? root("information") : child(root("information"), "情報Ⅰ", "level");
const infoFields = new Map(informationFields.map(title => [title, child(infoCourse, title, "field", "せかチャン公式高校情報Ⅰ講座の第1〜4章の分野名を使用。章の開始秒数は既存カタログの公式目次データを参照。") ]));
function addInformation(video: Video, units: Unit[]) {
  const name = units[0]?.name ?? "";
  const fieldName = informationFields.find(f => name.startsWith(f));
  if (!fieldName) {
    attach(child(infoCourse, "総復習・共通テスト対策", "unit"), video, units);
    return;
  }
  const field = infoFields.get(fieldName)!;
  attach(field, video, units);
  for (const chapter of video.chapters ?? []) {
    const node = child(field, chapter.title, "topic", `登録済みの公式講座目次に明示された章名・開始秒数を使用。${video.classificationEvidence}`);
    attach(node, video, units);
    node.targets ??= [];
    if (!node.targets.some(t => t.videoId === video.id && t.startSeconds === chapter.startSeconds)) {
      node.targets.push({ videoId: video.id, startSeconds: chapter.startSeconds, title: chapter.title });
    }
  }
}

function attachStructured(video:Video,unit:Unit){let parent=root(unit.subjectId);const labels=(unit.path||[]).filter(title=>title!==parent.title);for(const [index,title] of labels.entries()){const last=index===labels.length-1;const known=unit.subjectId==='mathematics'&&index===0?mathLevelNodes.get(title):undefined;parent=known||child(parent,title,last?'unit':index===0&&['数学','化学','文学国語','論理国語','歴史総合'].some(prefix=>title.startsWith(prefix))?'level':'field',unit.evidence||sourceEvidence);}attach(parent,video,[unit]);}
for (const canonical of catalog.videos) {
 for(const subjectId of videoSubjects(canonical)){
  const video=subjectId===canonical.subjectId?canonical:{...canonical,subjectId};
  const units=sources(video).sort((a,b)=>(unitOrder.get(a.id)||0)-(unitOrder.get(b.id)||0));
  if(!units.length){unknown(video,units);continue;}
  const structured=units.filter(unit=>unit.path?.length);for(const unit of structured)attachStructured(video,unit);
  const original=units.filter(unit=>!unit.path?.length);
  if(structured.length&&!['mathematics','japanese-history','world-history'].includes(subjectId))continue;
  if(!original.length)continue;
  switch(subjectId){case 'mathematics':addMath(video,original);break;case 'english':addEnglish(video,original);break;case 'physics':addPhysics(video,original);break;case 'chemistry':addChemistry(video,original);break;case 'japanese-history':case 'world-history':addHistory(video,original);break;case 'japanese':addJapanese(video,original);break;case 'information':addInformation(video,original);break;}
 }
}

// Expose a small-unit layer when titles actually repeat (e.g. explanation/exercise pairs).
// Single lessons remain directly accessible; no artificial singleton chains are created.
for (const node of [...learningNodes.values()]) {
  if (node.kind !== "unit" || !["mathematics", "english", "chemistry", "japanese"].includes(node.subjectId)) continue;
  const list = [...ownVideos.get(node.id)!].map(id => videoMap.get(id)!);
  if (list.length < 6) continue;
  const groups = new Map<string, Video[]>();
  for (const video of list) {
    const theme = lessonTitle(video.title);
    if (!theme || theme.length > 45 || theme === node.title) continue;
    const group = groups.get(theme) ?? []; group.push(video); groups.set(theme, group);
  }
  for (const [title, members] of groups) {
    if (members.length < 2) continue;
    const topic = child(node, title, "topic", "公開動画タイトルからシリーズ表記と回数のみを除いた同名項目。解説・演習や連続授業の参照をまとめています。内容の同等性を評価した分類ではありません。");
    for (const video of members) attach(topic, video, sources(video));
  }
}

function finalize(node: LearningNode): void {
  const seen = new Set(ownVideos.get(node.id));
  const sourceIds = new Set(node.sourceUnitIds);
  for (const id of node.children) {
    const sub = learningNodes.get(id)!;
    finalize(sub);
    for (const videoId of sub.videoIds) seen.add(videoId);
    for (const sourceId of sub.sourceUnitIds) sourceIds.add(sourceId);
    sourceRank.set(node.id, Math.min(sourceRank.get(node.id) ?? Infinity, sourceRank.get(id) ?? Infinity));
  }
  node.videoIds = [...seen].sort((a, b) => (videoOrder.get(a) ?? 0) - (videoOrder.get(b) ?? 0));
  node.sourceUnitIds = [...sourceIds].sort((a, b) => (unitOrder.get(a) ?? 0) - (unitOrder.get(b) ?? 0));
  // Empty branches are omitted even if a subject does not yet have that course or field.
  node.children = node.children.filter(id => learningNodes.get(id)!.videoIds.length > 0);
  if (node.id !== hierarchyRoots.mathematics && node.id !== infoCourse.id) {
    node.children.sort((a, b) => (sourceRank.get(a) ?? Infinity) - (sourceRank.get(b) ?? Infinity));
  }
}
for (const id of Object.values(hierarchyRoots)) finalize(learningNodes.get(id)!);
// Correct visible headings without changing existing navigation IDs.
for(const node of learningNodes.values()){
 if(node.subjectId!=='mathematics'||node.kind!=='field')continue;
 const parent=learningNodes.get(node.parentId||'');
 if(node.title==='数と式・論理'&&parent?.title==='数学Ⅰ')node.title='数と式';
 if(node.title==='数と式・論理'&&parent?.title==='数学Ⅱ')node.title='いろいろな式';
 if(node.title==='図形'&&parent?.title==='数学Ⅰ')node.title='図形と計量';
 if(node.title==='図形と座標'&&parent?.title==='数学Ⅱ')node.title='図形と方程式';
 if(node.title==='図形と座標'&&parent?.title==='数学C')node.title='ベクトル・平面上の曲線と複素数平面';
}
for (const [id, node] of learningNodes) if (node.kind !== "subject" && node.videoIds.length === 0) learningNodes.delete(id);

export function getNodePath(id: string): LearningNode[] {
  const path: LearningNode[] = [];
  const seen = new Set<string>();
  let node = learningNodes.get(id);
  while (node && !seen.has(node.id)) { seen.add(node.id); path.unshift(node); node = node.parentId ? learningNodes.get(node.parentId) : undefined; }
  return path;
}

export function nodeVideos(id: string): Video[] {
  return (learningNodes.get(id)?.videoIds ?? []).map(videoId => videoMap.get(videoId)).filter((v): v is Video => !!v);
}

export function videoNodePath(videoId: string): LearningNode[] {
  const choices = (videoLeaves.get(videoId) ?? []).map(id => getNodePath(id));
  choices.sort((a, b) => Number(a.some(n => n.title.includes("分類確認中"))) - Number(b.some(n => n.title.includes("分類確認中"))) || b.length - a.length);
  return choices[0] ?? [];
}

export function nodeHref(node: LearningNode): string {
  return node.kind === "subject" ? `#/subject/${node.subjectId}` : `#/category/${node.id}`;
}

const channelPriority: Record<SubjectId, string[]> = {
  mathematics: ["chowakaru", "stardy", "passlabo", "yobinori"], english: ["chowakaru", "tadayobi", "passlabo"],
  chemistry: ["chowakaru", "tadayobi", "yobinori"], physics: ["tadayobi", "yobinori"], japanese: ["tadayobi"],
  "japanese-history": ["mundi"], "world-history": ["mundi"], information: ["sekachan"],
};

/** Proposes an available core series by source coverage and the subject's selected provider.
 * This is a default learning route, not a ranking of instructor or lecture quality. */
export function primarySeriesFor(node: LearningNode): Series | undefined {
  if (node.kind === "subject" || node.kind === "level") return undefined;
  const ids = new Set(node.videoIds);
  const preferred = channelPriority[node.subjectId];
  const candidates = catalog.series.filter(s => seriesInSubject(s,node.subjectId)).map((series, index) => {
    const matching = series.videoIds.filter(id => ids.has(id));
    const core = matching.filter(id => videoMap.get(id)?.role === "core").length;
    const rank = preferred.indexOf(series.channelId);
    return { series, index, matching: matching.length, core, rank: rank < 0 ? preferred.length : rank };
  }).filter(c => c.core > 0 && (node.kind !== "field" || c.matching >= node.videoIds.length / 2));
  candidates.sort((a, b) => a.rank - b.rank || b.core - a.core || b.matching - a.matching || a.index - b.index);
  return candidates[0]?.series;
}
