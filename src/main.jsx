import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const seed = [
  { id: 1, title: 'Map out Q4 launch milestones', project: 'Website refresh', due: '2026-09-24', priority: 'High', done: false },
  { id: 2, title: 'Review the first round of concepts', project: 'Brand direction', due: '2026-09-24', priority: 'Medium', done: false },
  { id: 3, title: 'Send notes to the design team', project: 'Brand direction', due: '2026-09-25', priority: 'Low', done: false },
  { id: 4, title: 'Pull together customer quotes', project: 'Website refresh', due: '2026-09-26', priority: 'Medium', done: false },
  { id: 5, title: 'Set up kickoff with Alex', project: 'Content sprint', due: '2026-09-27', priority: 'Low', done: false },
  { id: 6, title: 'Share the updated project brief', project: 'Content sprint', due: '2026-09-28', priority: 'High', done: true },
];

const icons = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/></>,
  today: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.1L12 19l-1.9-5.9L4 11l6.1-2.2L12 3z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/></>,
};
function Icon({ name, size = 18 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>; }
const todayISO = '2026-09-23';
const initialTasks = JSON.parse(localStorage.getItem('tuggle.tasks') || 'null') || seed;

function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState('All tasks');
  const [query, setQuery] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState('');
  const [activeProject, setActiveProject] = useState('All projects');
  const [toast, setToast] = useState('');
  const persist = (next) => { setTasks(next); localStorage.setItem('tuggle.tasks', JSON.stringify(next)); };
  const complete = tasks.filter(t => t.done).length;
  const projects = [...new Set(tasks.map(t => t.project))];
  const visible = useMemo(() => tasks.filter(t => {
    const matchView = view === 'All tasks' || (view === 'Today' && t.due === todayISO) || (view === 'Upcoming' && t.due > todayISO) || (view === 'Completed' && t.done) || (view === 'In progress' && !t.done);
    const matchQuery = `${t.title} ${t.project}`.toLowerCase().includes(query.toLowerCase());
    return matchView && matchQuery && (activeProject === 'All projects' || t.project === activeProject);
  }), [tasks, view, query, activeProject]);
  const addTask = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    persist([{ id: Date.now(), title: draft.trim(), project: activeProject === 'All projects' ? 'Personal' : activeProject, due: todayISO, priority: 'Medium', done: false }, ...tasks]);
    setDraft(''); setShowComposer(false); setToast('Task added to your list'); setTimeout(() => setToast(''), 2400);
  };
  const toggle = id => persist(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const navigation = [{ name: 'All tasks', icon: 'grid', count: tasks.filter(t => !t.done).length }, { name: 'Today', icon: 'today', count: tasks.filter(t => t.due === todayISO && !t.done).length }, { name: 'Upcoming', icon: 'check' }, { name: 'Completed', icon: 'check', count: complete }];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span></span><span></span><span></span></div><span>Tuggle</span></div>
      <div className="workspace-switch"><div className="workspace-avatar">Y</div><div className="workspace-copy"><strong>Yunjie’s space</strong><small>Personal workspace</small></div><span className="chevron">⌄</span></div>
      <button className="new-task" onClick={() => setShowComposer(true)}><Icon name="plus" size={17}/> New task <kbd>N</kbd></button>
      <div className="side-label">WORKSPACE</div>
      <nav className="nav-list">{navigation.map(item => <button key={item.name} onClick={() => { setView(item.name); setActiveProject('All projects'); }} className={`nav-item ${view === item.name ? 'selected' : ''}`}><Icon name={item.icon}/><span>{item.name}</span>{item.count !== undefined && <small>{item.count}</small>}</button>)}</nav>
      <div className="projects-heading"><span className="side-label">PROJECTS</span><button aria-label="Add project" onClick={() => { setToast('Create projects by adding a task'); setTimeout(() => setToast(''), 2400); }}><Icon name="plus" size={16}/></button></div>
      <nav className="project-list">{projects.map((project, i) => <button className={`project-item ${activeProject === project ? 'project-active' : ''}`} key={project} onClick={() => { setActiveProject(activeProject === project ? 'All projects' : project); setView('All tasks'); }}><span className={`project-dot dot-${i % 4}`}></span>{project}<small>{tasks.filter(t => t.project === project && !t.done).length}</small></button>)}</nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Icon name="sparkle" size={17}/></div><strong>A little more room?</strong><p>Make space for bigger plans with Tuggle Pro.</p><button onClick={() => { setToast('You’re on the early access list ✨'); setTimeout(() => setToast(''), 2400); }}>Explore Pro <Icon name="arrow" size={14}/></button></div><div className="user-profile"><div className="profile-avatar">Y</div><div><strong>Yunjie Li</strong><small>Free plan</small></div><Icon name="more" size={19}/></div></div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{activeProject !== 'All projects' ? activeProject : view}</strong></div><div className="top-actions"><label className="search-box"><Icon name="search" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks..."/><kbd>⌘ K</kbd></label><button className="avatar-stack" title="Workspace members"><span>Y</span><i>+</i></button></div></header>
      <div className="page-content">
        <section className="welcome-row"><div><div className="date-line">WEDNESDAY, SEPTEMBER 23, 2026 <span className="sun">☀</span></div><h1>{view === 'Today' ? 'A good day to get things done.' : 'Make room for what matters.'}</h1><p>A little progress each day adds up to big results.</p></div><button className="primary-button" onClick={() => setShowComposer(true)}><Icon name="plus" size={17}/> Add a task</button></section>
        <section className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Open tasks</span><span className="stat-icon lilac"><Icon name="grid" size={16}/></span></div><strong>{tasks.length - complete}</strong><small><span className="green-trend">↗ 2</span> from last week</small><div className="mini-bars">{[25,39,32,49,43,66,56,76,62,82,69,94].map((h,i)=><i key={i} style={{height:`${h}%`}} className={i===11?'bar-current':''}></i>)}</div></div>
          <div className="stat-card"><div className="stat-top"><span>Due today</span><span className="stat-icon peach"><Icon name="today" size={16}/></span></div><strong>{tasks.filter(t => t.due === todayISO && !t.done).length}</strong><small>Keep your focus on today</small><div className="progress-track"><i style={{width:`${Math.min(100, tasks.filter(t => t.due === todayISO && t.done).length * 30)}%`}}></i></div></div>
          <div className="stat-card"><div className="stat-top"><span>Completed</span><span className="stat-icon mint"><Icon name="check" size={16}/></span></div><strong>{complete}<small className="out-of"> / {tasks.length}</small></strong><small>Look at you go. Keep it up!</small><div className="progress-track mint-track"><i style={{width:`${tasks.length ? (complete / tasks.length) * 100 : 0}%`}}></i></div></div>
        </section>
        <section className="focus-banner"><div className="focus-art"><span>✳</span><i></i><b></b></div><div className="focus-copy"><span className="eyebrow">YOUR DAILY FOCUS</span><strong>Small steps, steady momentum.</strong><p>You have <b>{tasks.filter(t => t.due === todayISO && !t.done).length} tasks</b> on your list for today. You’ve got this.</p></div><button onClick={() => setView('Today')}>See today’s tasks <Icon name="arrow" size={16}/></button><div className="banner-orb"></div></section>
        <section className="task-section"><div className="task-heading"><div><h2>{view === 'All tasks' ? 'Your tasks' : view}</h2><span>{visible.length} tasks to keep things moving</span></div><div className="task-tools"><select value={activeProject} onChange={e => setActiveProject(e.target.value)} aria-label="Filter by project"><option>All projects</option>{projects.map(p=><option key={p}>{p}</option>)}</select><button className="filter-button" onClick={() => setView(view === 'In progress' ? 'All tasks' : 'In progress')}><span className="filter-bars">☷</span> {view === 'In progress' ? 'In progress' : 'Filter'}</button><button className="more-button" aria-label="More options"><Icon name="more"/></button></div></div>
          <div className="task-list">{visible.map(task => <article className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}><button className={`task-check ${task.done ? 'checked' : ''}`} onClick={() => toggle(task.id)} aria-label={task.done ? 'Mark incomplete' : 'Complete task'}>{task.done && '✓'}</button><div className="task-info"><strong>{task.title}</strong><div className="task-meta"><span className="task-project"><i className={`project-dot dot-${projects.indexOf(task.project) % 4}`}></i>{task.project}</span><span className="meta-divider">·</span><span className={task.due === todayISO ? 'due-today' : ''}>{task.due === todayISO ? 'Today' : new Date(`${task.due}T12:00:00`).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span></div></div><span className={`priority priority-${task.priority.toLowerCase()}`}><i></i>{task.priority}</span><button className="row-more" aria-label="Task options"><Icon name="more" size={18}/></button></article>)}{visible.length === 0 && <div className="empty-state"><div>✳</div><strong>Nothing on this list yet</strong><span>Enjoy the breathing room, or add a task to get started.</span><button onClick={() => setShowComposer(true)}>Add a task</button></div>}</div>
          <button className="add-inline" onClick={() => setShowComposer(true)}><Icon name="plus" size={17}/> Add a task</button>
        </section>
        <footer className="footer-note"><span>Made for your next small win <b>✳</b></span><span>All changes saved automatically</span></footer>
      </div>
    </main>
    {showComposer && <div className="modal-backdrop" onClick={() => setShowComposer(false)}><form className="task-modal" onSubmit={addTask} onClick={e => e.stopPropagation()}><div className="modal-kicker">NEW TASK</div><h2>What’s on your mind?</h2><input autoFocus value={draft} onChange={e => setDraft(e.target.value)} placeholder="Give your task a name..."/><div className="modal-controls"><span>◷ &nbsp;Today</span><span>↗ &nbsp;Medium priority</span><span>▦ &nbsp;{activeProject === 'All projects' ? 'Personal' : activeProject}</span></div><div className="modal-actions"><button type="button" onClick={() => setShowComposer(false)}>Cancel</button><button className="primary-button" type="submit"><Icon name="plus" size={16}/> Add task</button></div></form></div>}
    {toast && <div className="toast">✳ &nbsp;{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
