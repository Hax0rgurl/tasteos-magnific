import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BadgeCheck,
  Boxes,
  Brain,
  Check,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  Database,
  FileText,
  Film,
  Gauge,
  Image as ImageIcon,
  Library,
  ListChecks,
  Megaphone,
  Play,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  Wand2,
} from 'lucide-react';
import './styles.css';

type Section = 'desk' | 'library' | 'workflows' | 'taste';

type Asset = {
  id: string;
  title: string;
  type: string;
  source: string;
  tags: string[];
  lastUsed: string;
  performance: number;
  thumbnail: string;
  client?: string;
  status?: string;
  platforms?: string[];
  usage?: string;
};

type Opportunity = {
  id: string;
  rank: number;
  confidence: number;
  title: string;
  format: string;
  whyNow: string;
  sourceIds: string[];
  estimatedCredits: number;
  expectedOutput: string;
  prompt: string;
  workflow: string[];
  checks: {
    privacy: string;
    taste: string;
    critic: string;
  };
};

type Feedback = {
  opportunityId: string;
  action: 'approve' | 'reject' | 'revise';
  note: string;
  at: string;
};

type EditingCapabilities = {
  ffmpeg: boolean;
  opencut: boolean;
  reclip: boolean;
  ffmpegPath?: string;
};

const agencyProfile = {
  name: 'Magnific Agency OS',
  makes: ['paid social ads', 'creator launch kits', 'short-form video', 'brand campaign systems'],
  tasteRules: ['premium surreal realism', 'fast editorial pacing', 'black / white / magenta energy', 'no generic stock-ad language'],
  forbidden: ['client NDA folders', 'unapproved faces', 'private talent usage', 'auto-publish without human review'],
};

const workflowDescriptions: Record<string, string> = {
  creations_search: 'Search Magnific archive',
  creations_get: 'Fetch source asset',
  resources_search: 'Find Magnific stock',
  video_generate: 'Generate video',
  images_generate: 'Generate stills',
  images_upscale: 'Magnific upscale',
  images_resize: 'Resize variants',
  creations_move: 'Move to campaign folder',
  audio_tts: 'Voice / audio pass',
};

const workflowTemplates = [
  {
    id: 'social-sprint',
    title: 'Social Launch Sprint',
    client: 'Fashion / product client',
    objective: 'Generate a 9:16 Reel, 1:1 paid-social cutdown, 4 story frames, and caption variants from Magnific assets.',
    route: ['Magnific archive', 'Magnific video / image generation', 'ffmpeg clip + crop fallback', 'approval queue'],
    outputs: ['Reel', 'TikTok cut', 'IG story set', 'paid thumbnail'],
    fallback: 'If Magnific cannot clip or trim the output, route media to ffmpeg for crop, trim, speed ramp, subtitles, and export.',
  },
  {
    id: 'ad-variants',
    title: 'Paid Ad Variant Factory',
    client: 'DTC product launch',
    objective: 'Turn one winning concept into hooks, product stills, UGC-style cuts, and platform-safe ad variations.',
    route: ['Magnific stock search', 'Magnific generation', 'TasteOS critic pass', 'Meta / TikTok export specs'],
    outputs: ['3 hooks', '6 image variants', '2 video cuts', 'copy matrix'],
    fallback: 'If direct video editing is not available, export frames and assemble variants with ffmpeg or handoff to OpenCut/Reclip.',
  },
  {
    id: 'brand-world',
    title: 'Brand World Expansion',
    client: 'Retainer account',
    objective: 'Expand an existing campaign aesthetic into new backgrounds, product scenes, motion boards, and creative briefs.',
    route: ['Library clustering', 'Magnific references', 'Campaign folder writeback', 'client review room'],
    outputs: ['Moodboard', 'shot list', 'prompt pack', 'asset folder'],
    fallback: 'If assets need sequencing, route generated images through ffmpeg slideshow/storyboard export for client review.',
  },
];

const tasteRows = [
  { rule: 'Premium surreal realism', signal: 'Approved product renders, rejected flat catalog shots', confidence: 92 },
  { rule: 'Fast editorial pacing', signal: 'Approves 8-15 sec cuts with punchy transitions', confidence: 88 },
  { rule: 'Black / white / magenta energy', signal: 'Current agency system and Magnific sponsor alignment', confidence: 84 },
  { rule: 'No generic marketing copy', signal: 'Critic blocks vague “futuristic” and “inspiring” language', confidence: 91 },
];

function classNames(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(' ');
}

async function getJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>('desk');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [mode, setMode] = useState('checking');
  const [trace, setTrace] = useState<string[]>([]);
  const [runStatus, setRunStatus] = useState('ready');
  const [activeView, setActiveView] = useState<'suggestions' | 'training'>('suggestions');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [libraryNotice, setLibraryNotice] = useState('Select an asset to route it into an agency workflow.');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [activeWorkflowId, setActiveWorkflowId] = useState(workflowTemplates[0].id);
  const [workflowNotice, setWorkflowNotice] = useState('Choose a campaign pipeline and queue it against Magnific assets.');
  const [capabilities, setCapabilities] = useState<EditingCapabilities>({ ffmpeg: false, opencut: false, reclip: false });

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    const health = await getJson<{ mode: string }>('/api/health');
    setMode(health.mode);
    const archive = await getJson<{ assets: Asset[] }>('/api/magnific/archive');
    const enriched = archive.assets.map(enrichAsset);
    setAssets(enriched);
    setSelectedAssetId(enriched[0]?.id || '');

    const generated = await getJson<{ opportunities: Opportunity[]; agentTrace: string[] }>('/api/agent/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: agencyProfile, feedback }),
    });
    setOpportunities(generated.opportunities);
    setTrace(generated.agentTrace);
    setSelectedId(generated.opportunities[0]?.id || '');

    const caps = await getJson<EditingCapabilities>('/api/editing/capabilities').catch(() => ({
      ffmpeg: false,
      opencut: false,
      reclip: false,
    }));
    setCapabilities(caps);
  }

  async function retrain(nextFeedback: Feedback[]) {
    const generated = await getJson<{ opportunities: Opportunity[]; agentTrace: string[] }>('/api/agent/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: agencyProfile, feedback: nextFeedback }),
    });
    setOpportunities(generated.opportunities);
    setTrace(generated.agentTrace);
    if (!generated.opportunities.some((item) => item.id === selectedId)) {
      setSelectedId(generated.opportunities[0]?.id || '');
    }
  }

  const selected = useMemo(() => {
    return opportunities.find((item) => item.id === selectedId) || opportunities[0];
  }, [opportunities, selectedId]);

  const selectedAssets = useMemo(() => {
    if (!selected) return [];
    return assets.filter((asset) => selected.sourceIds.includes(asset.id));
  }, [assets, selected]);

  const filteredAssets = useMemo(() => {
    const query = libraryQuery.toLowerCase().trim();
    return assets.filter((asset) => {
      const matchesFilter = libraryFilter === 'all' || asset.type === libraryFilter || asset.tags.includes(libraryFilter);
      const haystack = [asset.title, asset.client, asset.source, asset.type, asset.status, asset.usage, ...asset.tags].join(' ').toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [assets, libraryFilter, libraryQuery]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) || assets[0];
  const activeWorkflow = workflowTemplates.find((workflow) => workflow.id === activeWorkflowId) || workflowTemplates[0];

  function record(action: Feedback['action'], note: string) {
    if (!selected) return;
    const next = [
      {
        opportunityId: selected.id,
        action,
        note,
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...feedback,
    ].slice(0, 8);
    setFeedback(next);
    void retrain(next);
  }

  async function runInMagnific() {
    if (!selected) return;
    setRunStatus('routing');
    try {
      const result = await getJson<{ mode: string; status: string }>('/api/magnific/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: selected }),
      });
      setRunStatus(result.mode === 'demo' ? 'Magnific handoff staged' : result.status);
      record('approve', 'Approved for Magnific workflow run');
    } catch (error) {
      setRunStatus(error instanceof Error ? error.message : 'failed');
    }
  }

  function routeAsset(asset: Asset, destination: string) {
    setSelectedAssetId(asset.id);
    setLibraryNotice(`${asset.title} routed to ${destination}. Magnific handles generation/upscale; editing falls back to ffmpeg when needed.`);
  }

  function queueWorkflow() {
    setWorkflowNotice(`${activeWorkflow.title} queued. Backbone: Magnific. Edit fallback: ${
      capabilities.ffmpeg ? `ffmpeg available at ${capabilities.ffmpegPath}` : 'manual OpenCut/Reclip handoff'
    }.`);
  }

  const header = getHeader(activeSection);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <div>
            <strong>TasteOS</strong>
            <small>Agency OS for Magnific</small>
          </div>
        </div>

        <nav className="nav">
          <button className={activeSection === 'desk' ? 'active' : ''} onClick={() => setActiveSection('desk')}>
            <Brain size={16} /> Agent Desk
          </button>
          <button className={activeSection === 'library' ? 'active' : ''} onClick={() => setActiveSection('library')}>
            <Library size={16} /> Magnific Library
          </button>
          <button className={activeSection === 'workflows' ? 'active' : ''} onClick={() => setActiveSection('workflows')}>
            <Boxes size={16} /> Workflows
          </button>
          <button className={activeSection === 'taste' ? 'active' : ''} onClick={() => setActiveSection('taste')}>
            <Gauge size={16} /> TasteOS
          </button>
        </nav>

        <section className="side-panel">
          <div className="panel-title">
            <Database size={15} />
            Magnific backbone
          </div>
          <div className="status-row">
            <span className={classNames('status-dot', mode === 'magnific-api' && 'live')} />
            <span>{mode === 'magnific-api' ? 'API connected' : 'Demo mode'}</span>
          </div>
          <p>
            Agency archive, stock, AI generation, upscale, audio, video, and campaign folders run through Magnific first.
          </p>
        </section>

        <section className="side-panel">
          <div className="panel-title">
            <Scissors size={15} />
            Edit fallback
          </div>
          <div className="gate-grid">
            <span>ffmpeg</span><b>{capabilities.ffmpeg ? 'Ready' : 'Missing'}</b>
            <span>OpenCut</span><b>{capabilities.opencut ? 'Ready' : 'Manual'}</b>
            <span>Reclip</span><b>{capabilities.reclip ? 'Ready' : 'Manual'}</b>
          </div>
        </section>

        <section className="side-panel compact">
          <div className="panel-title">
            <ShieldCheck size={15} />
            Autonomy gate
          </div>
          <div className="gate-grid">
            <span>Suggest</span><b>On</b>
            <span>Draft</span><b>On</b>
            <span>Auto-publish</span><b>Off</b>
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{header.title}</h1>
            <p>{header.subtitle}</p>
          </div>
          <div className="toolbar">
            <button className="ghost" onClick={() => setActiveSection('library')}><Search size={16} /> Library</button>
            <button className="primary" onClick={() => void boot()}>
              <RefreshCw size={16} /> Re-score
            </button>
          </div>
        </header>

        <section className="profile-band">
          <div>
            <span>Agency makes</span>
            <strong>{agencyProfile.makes.join(' · ')}</strong>
          </div>
          <div>
            <span>Taste rules</span>
            <strong>{agencyProfile.tasteRules.slice(0, 4).join(' · ')}</strong>
          </div>
          <div>
            <span>Blocked before draft</span>
            <strong>{agencyProfile.forbidden.slice(0, 3).join(' · ')}</strong>
          </div>
        </section>

        {activeSection === 'desk' && (
          <DeskView
            activeView={activeView}
            assets={assets}
            feedback={feedback}
            opportunities={opportunities}
            record={record}
            runInMagnific={runInMagnific}
            runStatus={runStatus}
            selected={selected}
            selectedAssets={selectedAssets}
            selectedId={selectedId}
            setActiveView={setActiveView}
            setSelectedId={setSelectedId}
            trace={trace}
          />
        )}

        {activeSection === 'library' && (
          <LibraryView
            assets={filteredAssets}
            filter={libraryFilter}
            notice={libraryNotice}
            query={libraryQuery}
            routeAsset={routeAsset}
            selectedAsset={selectedAsset}
            setFilter={setLibraryFilter}
            setQuery={setLibraryQuery}
            setSelectedAssetId={setSelectedAssetId}
          />
        )}

        {activeSection === 'workflows' && (
          <WorkflowsView
            activeWorkflow={activeWorkflow}
            activeWorkflowId={activeWorkflowId}
            capabilities={capabilities}
            notice={workflowNotice}
            queueWorkflow={queueWorkflow}
            setActiveWorkflowId={setActiveWorkflowId}
          />
        )}

        {activeSection === 'taste' && (
          <TasteView feedback={feedback} />
        )}
      </section>
    </main>
  );
}

function DeskView(props: {
  activeView: 'suggestions' | 'training';
  assets: Asset[];
  feedback: Feedback[];
  opportunities: Opportunity[];
  record: (action: Feedback['action'], note: string) => void;
  runInMagnific: () => Promise<void>;
  runStatus: string;
  selected?: Opportunity;
  selectedAssets: Asset[];
  selectedId: string;
  setActiveView: (view: 'suggestions' | 'training') => void;
  setSelectedId: (id: string) => void;
  trace: string[];
}) {
  const {
    activeView,
    assets,
    feedback,
    opportunities,
    record,
    runInMagnific,
    runStatus,
    selected,
    selectedAssets,
    selectedId,
    setActiveView,
    setSelectedId,
    trace,
  } = props;

  return (
    <>
      <div className="desk-grid">
        <section className="opportunity-list">
          <div className="section-head">
            <div>
              <h2>Agency opportunity queue</h2>
              <p>What the agency should pitch, generate, cut, or test next.</p>
            </div>
            <div className="segmented">
              <button className={activeView === 'suggestions' ? 'selected' : ''} onClick={() => setActiveView('suggestions')}>Suggestions</button>
              <button className={activeView === 'training' ? 'selected' : ''} onClick={() => setActiveView('training')}>Training</button>
            </div>
          </div>

          {activeView === 'suggestions' ? (
            <div className="cards">
              {opportunities.map((item) => (
                <button
                  key={item.id}
                  className={classNames('opportunity-card', item.id === selectedId && 'selected-card')}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="rank">#{item.rank}</div>
                  <div className="card-main">
                    <div className="card-title-row">
                      <h3>{item.title}</h3>
                      <span>{item.confidence}%</span>
                    </div>
                    <p>{item.whyNow}</p>
                    <div className="asset-strip">
                      {assets.filter((asset) => item.sourceIds.includes(asset.id)).map((asset) => (
                        <img src={asset.thumbnail} alt="" key={asset.id} />
                      ))}
                      <div className="format-pill"><Megaphone size={13} /> {item.format}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <TrainingSandbox feedback={feedback} />
          )}
        </section>

        <aside className="inspector">
          {selected ? (
            <>
              <div className="inspector-top">
                <span className="confidence-ring">{selected.confidence}</span>
                <div>
                  <h2>{selected.title}</h2>
                  <p>{selected.expectedOutput}</p>
                </div>
              </div>

              <div className="source-grid">
                {selectedAssets.map((asset) => (
                  <article key={asset.id} className="asset-card">
                    <img src={asset.thumbnail} alt="" />
                    <div>
                      <strong>{asset.title}</strong>
                      <span>{asset.source} · {asset.client || 'agency archive'}</span>
                    </div>
                  </article>
                ))}
              </div>

              <section className="checklist">
                <CheckRow icon={<ShieldCheck size={15} />} label="Privacy" value={selected.checks.privacy} />
                <CheckRow icon={<BadgeCheck size={15} />} label="Taste" value={selected.checks.taste} />
                <CheckRow icon={<CircleAlert size={15} />} label="Critic" value={selected.checks.critic} />
              </section>

              <section className="workflow">
                <div className="section-head tight">
                  <h3>Magnific execution path</h3>
                  <span>{selected.estimatedCredits} est. credits</span>
                </div>
                <div className="workflow-chain">
                  {selected.workflow.map((step) => (
                    <span key={step}>{workflowDescriptions[step] || step}</span>
                  ))}
                </div>
              </section>

              <section className="prompt-box">
                <div className="section-head tight">
                  <h3>Campaign prompt</h3>
                  <FileText size={15} />
                </div>
                <p>{selected.prompt}</p>
              </section>

              <div className="action-row">
                <button className="reject" onClick={() => record('reject', 'Agency rejected: wrong client taste or weak concept')}>
                  <ThumbsDown size={16} /> Disapprove
                </button>
                <button className="revise" onClick={() => record('revise', 'Revise: sharper hook, stronger client specificity, less generic ad language')}>
                  <Wand2 size={16} /> Revise
                </button>
                <button className="run" onClick={() => void runInMagnific()}>
                  <Play size={16} /> Run in Magnific
                </button>
              </div>
              <div className="run-status">{runStatus}</div>
            </>
          ) : null}
        </aside>
      </div>

      <section className="agent-trace">
        <div className="section-head tight">
          <h2>Agent reasoning exposed</h2>
          <ListChecks size={16} />
        </div>
        <div className="trace-grid">
          {trace.map((item, index) => (
            <article key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function LibraryView(props: {
  assets: Asset[];
  filter: string;
  notice: string;
  query: string;
  routeAsset: (asset: Asset, destination: string) => void;
  selectedAsset?: Asset;
  setFilter: (filter: string) => void;
  setQuery: (query: string) => void;
  setSelectedAssetId: (id: string) => void;
}) {
  const { assets, filter, notice, query, routeAsset, selectedAsset, setFilter, setQuery, setSelectedAssetId } = props;
  const filters = ['all', 'image', 'video', 'audio', 'product', 'fashion', 'documentary'];

  return (
    <div className="view-grid library-layout">
      <section className="opportunity-list">
        <div className="section-head">
          <div>
            <h2>Magnific agency library</h2>
            <p>Stock, AI generations, reusable client assets, and raw material for campaigns.</p>
          </div>
          <div className="search-box">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, tag, usage" />
          </div>
        </div>

        <div className="filter-row">
          {filters.map((item) => (
            <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="library-grid">
          {assets.map((asset) => (
            <button
              key={asset.id}
              className={classNames('library-card', selectedAsset?.id === asset.id && 'selected-card')}
              onClick={() => setSelectedAssetId(asset.id)}
            >
              <img src={asset.thumbnail} alt="" />
              <div>
                <span>{asset.type} · {asset.status}</span>
                <h3>{asset.title}</h3>
                <p>{asset.client} · {asset.usage}</p>
                <div className="tag-row">{asset.tags.slice(0, 3).map((tag) => <b key={tag}>{tag}</b>)}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="inspector">
        {selectedAsset ? (
          <>
            <div className="asset-preview">
              <img src={selectedAsset.thumbnail} alt="" />
            </div>
            <div className="inspector-top compact-inspector">
              <span className="confidence-ring">{selectedAsset.performance}</span>
              <div>
                <h2>{selectedAsset.title}</h2>
                <p>{selectedAsset.client} · {selectedAsset.source}</p>
              </div>
            </div>

            <section className="checklist">
              <CheckRow icon={<ImageIcon size={15} />} label="Best use" value={selectedAsset.usage || 'Campaign source asset'} />
              <CheckRow icon={<Clapperboard size={15} />} label="Channels" value={(selectedAsset.platforms || ['Instagram', 'TikTok']).join(', ')} />
              <CheckRow icon={<ShieldCheck size={15} />} label="Agency routing" value={notice} />
            </section>

            <div className="action-row stacked-actions">
              <button className="run" onClick={() => routeAsset(selectedAsset, 'Social Launch Sprint')}>
                <Play size={16} /> Send to sprint
              </button>
              <button className="revise" onClick={() => routeAsset(selectedAsset, 'ffmpeg/OpenCut edit lane')}>
                <Scissors size={16} /> Clip / edit fallback
              </button>
              <button className="reject" onClick={() => routeAsset(selectedAsset, 'hold queue')}>
                <ThumbsDown size={16} /> Hold for client
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function WorkflowsView(props: {
  activeWorkflow: typeof workflowTemplates[number];
  activeWorkflowId: string;
  capabilities: EditingCapabilities;
  notice: string;
  queueWorkflow: () => void;
  setActiveWorkflowId: (id: string) => void;
}) {
  const { activeWorkflow, activeWorkflowId, capabilities, notice, queueWorkflow, setActiveWorkflowId } = props;

  return (
    <div className="view-grid workflow-layout">
      <section className="opportunity-list">
        <div className="section-head">
          <div>
            <h2>Workflow factory</h2>
            <p>Campaign pipelines for creative, social, ads, and marketing operations.</p>
          </div>
          <button className="primary" onClick={queueWorkflow}><Play size={15} /> Queue workflow</button>
        </div>

        <div className="workflow-template-list">
          {workflowTemplates.map((workflow) => (
            <button
              key={workflow.id}
              className={classNames('workflow-template', activeWorkflowId === workflow.id && 'selected-card')}
              onClick={() => setActiveWorkflowId(workflow.id)}
            >
              <span>{workflow.client}</span>
              <h3>{workflow.title}</h3>
              <p>{workflow.objective}</p>
              <div className="tag-row">{workflow.outputs.map((output) => <b key={output}>{output}</b>)}</div>
            </button>
          ))}
        </div>
      </section>

      <aside className="inspector">
        <div className="inspector-top">
          <span className="confidence-ring"><Film size={24} /></span>
          <div>
            <h2>{activeWorkflow.title}</h2>
            <p>{activeWorkflow.objective}</p>
          </div>
        </div>

        <section className="workflow">
          <div className="section-head tight">
            <h3>Backbone route</h3>
            <span>Magnific first</span>
          </div>
          <div className="workflow-chain">
            {activeWorkflow.route.map((step) => <span key={step}>{step}</span>)}
          </div>
        </section>

        <section className="checklist">
          <CheckRow icon={<Database size={15} />} label="Magnific role" value="Source archive, stock search, AI generation, upscale, audio, video, and writeback into campaign folders." />
          <CheckRow icon={<Scissors size={15} />} label="Edit fallback" value={activeWorkflow.fallback} />
          <CheckRow
            icon={<Check size={15} />}
            label="Local capability"
            value={`ffmpeg: ${capabilities.ffmpeg ? `ready (${capabilities.ffmpegPath})` : 'missing'}; OpenCut: ${capabilities.opencut ? 'ready' : 'manual'}; Reclip: ${capabilities.reclip ? 'ready' : 'manual'}.`}
          />
        </section>

        <section className="prompt-box">
          <div className="section-head tight">
            <h3>Queue status</h3>
            <ListChecks size={15} />
          </div>
          <p>{notice}</p>
        </section>
      </aside>
    </div>
  );
}

function TasteView({ feedback }: { feedback: Feedback[] }) {
  return (
    <div className="view-grid taste-layout">
      <section className="opportunity-list">
        <div className="section-head">
          <div>
            <h2>TasteOS agency model</h2>
            <p>The agency's learned judgment layer. It scores concepts before clients or publishers see them.</p>
          </div>
          <div className="format-pill"><ShieldCheck size={13} /> Auto-publish off</div>
        </div>

        <div className="taste-table">
          {tasteRows.map((row) => (
            <article key={row.rule}>
              <div>
                <span>{row.confidence}% learned</span>
                <h3>{row.rule}</h3>
                <p>{row.signal}</p>
              </div>
              <div className="taste-meter"><i style={{ width: `${row.confidence}%` }} /></div>
            </article>
          ))}
        </div>
      </section>

      <aside className="inspector">
        <div className="inspector-top">
          <span className="confidence-ring"><Brain size={24} /></span>
          <div>
            <h2>Trust is earned</h2>
            <p>Every approval, rejection, and revision updates the agency taste model.</p>
          </div>
        </div>
        <TrainingSandbox feedback={feedback} />
      </aside>
    </div>
  );
}

function CheckRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="check-row">
      <div>{icon}<strong>{label}</strong></div>
      <p>{value}</p>
    </div>
  );
}

function TrainingSandbox({ feedback }: { feedback: Feedback[] }) {
  const empty = feedback.length === 0;
  return (
    <section className="training-box">
      <div className="sandbox-hero">
        <Brain size={28} />
        <div>
          <h3>Training Sandbox</h3>
          <p>Low-confidence agency drafts stay here until TasteOS proves it understands the client and brand.</p>
        </div>
      </div>
      <div className="sandbox-grid">
        <div>
          <span>Low-confidence experiment</span>
          <strong>Turn coffee tests into a motivational carousel</strong>
          <p>Critic warning: too generic for a premium campaign account.</p>
        </div>
        <div>
          <span>Preference learned</span>
          <strong>{empty ? 'Waiting for agency approval or disapproval' : feedback[0].note}</strong>
          <p>{empty ? 'The agent stays conservative until account teams train it with real choices.' : `Last action recorded at ${feedback[0].at}.`}</p>
        </div>
      </div>
    </section>
  );
}

function enrichAsset(asset: Asset, index: number): Asset {
  const enrichment = [
    {
      client: 'Liquid Light Studio',
      status: 'ready for paid social',
      platforms: ['Instagram', 'TikTok', 'Meta Ads'],
      usage: 'hero product visual, ad thumbnail, campaign mood',
    },
    {
      client: 'Neon Atelier',
      status: 'needs edit pass',
      platforms: ['Reels', 'TikTok', 'YouTube Shorts'],
      usage: 'short-form fashion reel source',
    },
    {
      client: 'Cafe launch account',
      status: 'client-review safe',
      platforms: ['Instagram carousel', 'Pinterest', 'landing page'],
      usage: 'editorial stills and process content',
    },
    {
      client: 'Founder story retainer',
      status: 'raw narration',
      platforms: ['LinkedIn', 'YouTube Shorts', 'newsletter'],
      usage: 'voiceover and mini-doc package',
    },
  ][index % 4];

  return { ...asset, ...enrichment };
}

function getHeader(section: Section) {
  switch (section) {
    case 'library':
      return {
        title: 'Magnific Library',
        subtitle: 'A working agency archive: client assets, Magnific stock, AI generations, campaign source material, and route-to-edit actions.',
      };
    case 'workflows':
      return {
        title: 'Workflow Factory',
        subtitle: 'Campaign pipelines for a creative social media, ad, and marketing agency with Magnific as the AI content backbone.',
      };
    case 'taste':
      return {
        title: 'TasteOS',
        subtitle: 'The agency judgment layer: learned creative taste, client rules, privacy gates, critic checks, and human approval before publishing.',
      };
    default:
      return {
        title: 'Agency Command Desk',
        subtitle: 'Agent reviews clients, archive assets, available Magnific workflows, and edit fallbacks to propose what the agency should make next.',
      };
  }
}

createRoot(document.getElementById('root')!).render(<App />);
