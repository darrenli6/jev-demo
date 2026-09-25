"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Mode = "noul" | "choice" | "score";
type Locale = "en" | "zh";
type ApiResult = { model?: string; answers?: Record<string, Record<string, unknown>>; usage?: { input_tokens?: number; output_tokens?: number }; error?: string };
type HealthStatus = "checking" | "online" | "offline" | "unconfigured";

const modeDetails: Record<Mode, { eyebrow: string; title: string }> = { noul: { eyebrow: "Binary signal", title: "Noul" }, choice: { eyebrow: "Multi-class routing", title: "Choice" }, score: { eyebrow: "Ordinal scale", title: "Score" } };
const translations = {
  en: {
    hero: ["Turn every piece of text,", "into a measurable signal.", "Transform natural language into clear, reliable, actionable judgments."],
    configure: "Define your evaluation", output: "Analysis result", configureKicker: "01 / CONFIGURE", outputKicker: "02 / OUTPUT", configureTabs: "Evaluation type", modes: { noul: { label: "Binary signal", description: "Detect whether a text expresses a clear signal.", question: "Does this message express urgency?", tab: "Judge" }, choice: { label: "Multi-class routing", description: "Identify the best match from your custom categories.", question: "Which team should handle this message?", tab: "Classify" }, score: { label: "Ordinal scale", description: "Measure intensity or degree using an ordered scale.", question: "How frustrated does the customer appear?", tab: "Score" } },
    apiKey: "TYPESAFE_API_KEY", apiRequired: "REQUIRED · SAVED LOCALLY", apiPlaceholder: "Enter your Typesafe API Key", apiNote: "No .env key detected. This key is stored in your current browser only.", state: "Background", statePlaceholder: "Paste context to analyze, such as a customer message, ticket, or product feedback…", instructions: "Question", criteria: "Criteria", addOption: "+ Add option", addCriterion: "+ Add criterion", keyPlaceholder: "key", optionPlaceholder: "Option description", scorePlaceholder: "Describe what this level represents", submit: "Run evaluation", analyzing: "Analyzing…", emptyTitle: "Ready when you are", emptyDescription: "Fill in the background and question. JEV will return a structured evaluation.", waiting: "WAITING", complete: "COMPLETE", errorKey: "Enter your TYPESAFE_API_KEY first.", errorNoul: "Fill in the background and question before submitting.", errorOptions: "Fill in the background, question, and at least two valid options.", remove: "Remove option", raw: "View raw response", rawHint: "JSON · COLLAPSED BY DEFAULT", recommended: "Recommended category selected from your custom options", scoreLevel: "Score level", direct: "DIRECT SIGNAL", confidence: "confidence", model: "MODEL", tokens: "TOKENS", online: "ONLINE", checking: "CHECKING", offline: "OFFLINE", unconfigured: "NOT CONFIGURED", home: "JEV Studio home", powered: "JEV STUDIO · POWERED BY TYPESAFE", language: "中文", languageLabel: "Switch to Chinese",
  },
  zh: {
    hero: ["让每一段文本，", "变得可衡量。", "将自然语言转化为清晰、可靠、可行动的判断。"],
    configure: "定义你的评估", output: "分析结果", configureKicker: "01 / CONFIGURE", outputKicker: "02 / OUTPUT", configureTabs: "评估类型", modes: { noul: { label: "二元信号", description: "判断一段文本是否表达了明确的信号。", question: "这段内容是否表达了紧迫感？", tab: "判断" }, choice: { label: "多分类路由", description: "从自定义分类中识别最匹配的选项。", question: "这条消息应该由哪个团队处理？", tab: "分类" }, score: { label: "有序评分", description: "用有序标准衡量文本中的强度或程度。", question: "客户看起来有多沮丧？", tab: "评分" } },
    apiKey: "TYPESAFE_API_KEY", apiRequired: "必填 · 仅本地保存", apiPlaceholder: "输入 Typesafe API Key", apiNote: "未检测到 .env 配置，Key 仅保存在当前浏览器中。", state: "背景", statePlaceholder: "粘贴一段需要分析的背景，例如客户消息、工单或产品反馈…", instructions: "问题", criteria: "选项", addOption: "＋ 添加选项", addCriterion: "＋ 添加标准", keyPlaceholder: "key", optionPlaceholder: "选项说明", scorePlaceholder: "描述这一档代表的状态", submit: "运行评估", analyzing: "正在分析…", emptyTitle: "准备好开始了吗？", emptyDescription: "填写左侧背景与问题，JEV 会返回结构化的评估结果。", waiting: "WAITING", complete: "COMPLETE", errorKey: "请先填写 TYPESAFE_API_KEY。", errorNoul: "请填写背景和问题后再提交。", errorOptions: "请填写背景、问题，并至少保留两个有效选项。", remove: "移除选项", raw: "查看原始报文", rawHint: "JSON · 默认折叠", recommended: "推荐分类已从自定义选项中选出", scoreLevel: "评分等级", direct: "直接信号", confidence: "置信度", model: "模型", tokens: "用量", online: "在线", checking: "检查中", offline: "离线", unconfigured: "未配置", home: "JEV Studio 首页", powered: "JEV STUDIO · POWERED BY TYPESAFE", language: "EN", languageLabel: "切换到英文",
  },
} as const;
type Translation = (typeof translations)[Locale];

const STORAGE_KEY = "jev-studio-draft";
const LOCALE_KEY = "jev-studio-locale";
type Draft = { mode: Mode; state: string; instructions?: string; questions?: Partial<Record<Mode, string>>; apiKey: string; choiceOptions: { key: string; value: string }[]; scoreOptions: string[] };
type QuestionsByMode = Record<Mode, string>;

export default function Home() {
  const [mode, setMode] = useState<Mode>("noul");
  const [locale, setLocale] = useState<Locale>("en");
  const [state, setState] = useState("");
  const [questionsByMode, setQuestionsByMode] = useState<QuestionsByMode>({ noul: "", choice: "", score: "" });
  const [apiKey, setApiKey] = useState("");
  const [apiConfigured, setApiConfigured] = useState(true);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");
  const [choiceOptions, setChoiceOptions] = useState([{ key: "", value: "" }]);
  const [scoreOptions, setScoreOptions] = useState([""]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const text = translations[locale];
  const current = { ...modeDetails[mode], ...text.modes[mode] };

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const savedLocale = window.localStorage.getItem(LOCALE_KEY);
        if (savedLocale === "en" || savedLocale === "zh") setLocale(savedLocale);
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const draft = JSON.parse(saved) as Partial<Draft>;
          let restoredMode: Mode = "noul";
          if (draft.mode && draft.mode in modeDetails) {
            restoredMode = draft.mode;
            setMode(draft.mode);
          }
          if (typeof draft.state === "string") setState(draft.state);
          if (draft.questions && typeof draft.questions === "object") {
            setQuestionsByMode((currentQuestions) => ({ ...currentQuestions, ...draft.questions }));
          } else if (typeof draft.instructions === "string") {
            // Migrate drafts written before questions became tab-specific.
            setQuestionsByMode((currentQuestions) => ({ ...currentQuestions, [restoredMode]: draft.instructions }));
          }
          if (typeof draft.apiKey === "string") setApiKey(draft.apiKey);
          if (Array.isArray(draft.choiceOptions) && draft.choiceOptions.length) setChoiceOptions(draft.choiceOptions);
          if (Array.isArray(draft.scoreOptions) && draft.scoreOptions.length) setScoreOptions(draft.scoreOptions);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setDraftLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  function toggleLocale() {
    const nextLocale = locale === "en" ? "zh" : "en";
    setLocale(nextLocale);
    window.localStorage.setItem(LOCALE_KEY, nextLocale);
  }

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data: { configured?: boolean; status?: HealthStatus }) => {
        setApiConfigured(Boolean(data.configured));
        setHealthStatus(data.status || "offline");
      })
      .catch(() => {
        setApiConfigured(false);
        setHealthStatus("offline");
      });
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    const draft: Draft = { mode, state, questions: questionsByMode, apiKey, choiceOptions, scoreOptions };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [apiKey, choiceOptions, draftLoaded, mode, questionsByMode, scoreOptions, state]);
  const instructions = questionsByMode[mode];
  const canSubmit = useMemo(() => {
    if (!state.trim() || !instructions.trim() || (!apiConfigured && !apiKey.trim())) return false;
    if (mode === "choice") return choiceOptions.length > 1 && choiceOptions.every((item) => item.key.trim() && item.value.trim());
    if (mode === "score") return scoreOptions.length > 1 && scoreOptions.every((item) => item.trim());
    return true;
  }, [apiConfigured, apiKey, choiceOptions, instructions, mode, scoreOptions, state]);

  function updateQuestion(value: string) { setQuestionsByMode((questions) => ({ ...questions, [mode]: value })); }
  function updateChoice(index: number, field: "key" | "value", value: string) { setChoiceOptions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)); }
  function updateScore(index: number, value: string) { setScoreOptions((items) => items.map((item, itemIndex) => itemIndex === index ? value : item)); }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setResult(null);
    if (!canSubmit) { setError(!apiConfigured && !apiKey.trim() ? text.errorKey : mode === "noul" ? text.errorNoul : text.errorOptions); return; }
    setLoading(true);
    const questionKey = mode === "noul" ? "urgency" : mode === "choice" ? "department" : "frustration";
    const question: Record<string, unknown> = { type: mode, instructions: instructions.trim() };
    if (mode === "choice") question.criteria = Object.fromEntries(choiceOptions.map((item) => [item.key.trim(), item.value.trim()]));
    if (mode === "score") question.criteria = scoreOptions.map((item) => item.trim());
    try {
      const response = await fetch("/api/systemone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(apiConfigured ? {} : { apiKey: apiKey.trim() }), state: state.trim(), model: "jev-latest", questions: { [questionKey]: question } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || (locale === "en" ? "Request failed. Please try again." : "请求失败，请稍后重试。")); setResult(data);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : (locale === "en" ? "Request failed. Please try again." : "请求失败，请稍后重试。")); } finally { setLoading(false); }
  }

  return <main className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="grid-overlay" />
    <header className="topbar"><Link className="brand" href="/" aria-label={text.home}><span className="brand-mark">J</span><span>JEV<span className="brand-muted"> / </span>STUDIO</span></Link><div className="topbar-actions"><div className={`status-pill status-${healthStatus}`}><span className="status-dot" /> Typesafe API <span className="status-live">{text[healthStatus]}</span></div><button className="language-toggle" onClick={toggleLocale} aria-label={text.languageLabel}>{text.language}</button></div></header>
    <section className="hero"><div className="hero-copy"><p className="overline">JEV · EVALUATION LAB</p><h1>{text.hero[0]}<em>{text.hero[1]}</em></h1><p className="hero-subtitle">{text.hero[2]}</p></div><div className="hero-orbit" aria-hidden="true"><span className="orbit-ring ring-a" /><span className="orbit-ring ring-b" /><span className="orbit-core">J</span></div></section>
    <section className="workspace"><div className="panel config-panel"><div className="panel-heading"><div><p className="section-kicker">{text.configureKicker}</p><h2>{text.configure}</h2></div><span className="panel-index">{String(["noul", "choice", "score"].indexOf(mode) + 1).padStart(2, "0")} / 03</span></div>
      <div className="tabs" role="tablist" aria-label={text.configureTabs}>{(Object.keys(modeDetails) as Mode[]).map((item) => <button key={item} className={`tab ${mode === item ? "active" : ""}`} role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setResult(null); setError(""); }}><span>{item}</span><small>{text.modes[item].tab}</small></button>)}</div>
      <div className="mode-intro"><span className="mode-label">{current.eyebrow}</span><h3>{current.title}</h3><p>{current.description}</p></div>
      <form onSubmit={handleSubmit}>{!apiConfigured && <div className="api-key-box"><label className="field-label" htmlFor="api-key">{text.apiKey} <span>{text.apiRequired}</span></label><input id="api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={text.apiPlaceholder} autoComplete="off" /><p>{text.apiNote}</p></div>}<label className="field-label" htmlFor="state">{text.state} <span>STATE</span></label><textarea id="state" value={state} onChange={(event) => setState(event.target.value)} placeholder={text.statePlaceholder} rows={5} /><label className="field-label" htmlFor="instructions">{text.instructions} <span>INSTRUCTIONS</span></label><textarea id="instructions" value={instructions} onChange={(event) => updateQuestion(event.target.value)} placeholder={current.question} rows={3} />
        {mode === "choice" && <div className="criteria-block"><div className="criteria-heading"><label className="field-label">{text.criteria} <span>CRITERIA</span></label><button type="button" className="text-button" onClick={() => setChoiceOptions((items) => [...items, { key: `option${items.length + 1}`, value: "" }])}>{text.addOption}</button></div>{choiceOptions.map((item, index) => <div className="option-row" key={`${index}-${item.key}`}><input aria-label={`${text.criteria} ${index + 1} key`} value={item.key} onChange={(event) => updateChoice(index, "key", event.target.value)} placeholder={text.keyPlaceholder} /><input aria-label={`${text.criteria} ${index + 1} description`} value={item.value} onChange={(event) => updateChoice(index, "value", event.target.value)} placeholder={text.optionPlaceholder} />{choiceOptions.length > 2 && <button type="button" className="remove-button" aria-label={text.remove} onClick={() => setChoiceOptions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button>}</div>)}</div>}
        {mode === "score" && <div className="criteria-block"><div className="criteria-heading"><label className="field-label">{text.criteria} <span>CRITERIA</span></label><button type="button" className="text-button" onClick={() => setScoreOptions((items) => [...items, ""])}>{text.addCriterion}</button></div>{scoreOptions.map((item, index) => <div className="score-row" key={index}><span>{index}</span><input aria-label={`${text.criteria} ${index + 1}`} value={item} onChange={(event) => updateScore(index, event.target.value)} placeholder={text.scorePlaceholder} />{scoreOptions.length > 2 && <button type="button" className="remove-button" aria-label={text.remove} onClick={() => setScoreOptions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button>}</div>)}</div>}
        <button className="submit-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> {text.analyzing}</> : <>{text.submit} <span>↗</span></>}</button>{error && <p className="form-error" role="alert">{error}</p>}</form></div>
      <div className="panel result-panel"><div className="panel-heading"><div><p className="section-kicker">{text.outputKicker}</p><h2>{text.output}</h2></div><span className="result-badge">{result ? text.complete : text.waiting}</span></div>{result ? <ResultView result={result} mode={mode} text={text} /> : <div className="empty-state"><div className="empty-icon">✦</div><h3>{text.emptyTitle}</h3><p>{text.emptyDescription}</p><div className="empty-lines"><span /><span /><span /></div></div>}</div></section>
    <footer className="footer"><span>{text.powered}</span><span>MODEL / JEV-LATEST</span></footer></main>;
}

function ResultView({ result, mode, text }: { result: ApiResult; mode: Mode; text: Translation }) {
  const answer = result.answers ? Object.values(result.answers)[0] : undefined;
  const probabilities = answer?.probabilities as Record<string, number> | undefined;
  return <div className="result-content"><div className="answer-card"><div className="answer-topline"><span>ANSWER · {mode.toUpperCase()}</span><span className="confidence">{typeof answer?.confidence === "number" ? `${Math.round(answer.confidence * 100)}% ${text.confidence}` : text.direct}</span></div><div className="primary-answer">{String(answer?.[mode] ?? "—")}</div>{mode === "score" && typeof answer?.score === "number" && <p className="answer-note">{text.scoreLevel}: {answer.score}</p>}{mode === "choice" && typeof answer?.choice === "string" && <p className="answer-note">{text.recommended}</p>}</div>{probabilities && <div className="probability-card"><div className="answer-topline"><span>PROBABILITIES</span><span>MODEL OUTPUT</span></div>{Object.entries(probabilities).map(([key, value]) => <div className="probability-row" key={key}><span>{key}</span><div className="bar-track"><span style={{ width: `${Math.max(2, value * 100)}%` }} /></div><strong>{Math.round(value * 100)}%</strong></div>)}</div>}<div className="usage-row"><span>{text.model} <b>{result.model || "jev-latest"}</b></span><span>{text.tokens} <b>{(result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0)}</b></span></div><details className="raw-response"><summary><span>{text.raw}</span><span className="raw-response-hint">{text.rawHint}</span></summary><pre>{JSON.stringify(result, null, 2)}</pre></details></div>;
}
