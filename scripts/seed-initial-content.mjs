import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if ((!supabaseUrl || !serviceKey) && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !serviceKey) serviceKey = val;
    }
  }
}

const adminId = '3375daa9-6d77-4da9-aa7d-817c8efa3a0b'; // verified admin user

const supabase = createClient(supabaseUrl, serviceKey);

async function seedContent() {
  console.log('Seeding initial community projects, challenges, and opportunities...');

  // 1. Ensure admin profile is properly populated
  await supabase.from('profiles').upsert({
    id: adminId,
    username: 'zaahid_lead',
    full_name: 'Mohammed Zaahid',
    bio: 'Lead Architect & Community Founder. Building open-source developer infrastructure and empowering community engineering teams.',
    department: 'Engineering & Community Infrastructure',
    github_url: 'https://github.com/Mohammed-Zaahid-Yassin',
    linkedin_url: 'https://linkedin.com',
    portfolio_url: 'https://community-developer-hub.vercel.app',
    current_availability: 'open_to_collaborate',
    collaboration_style: 'leading_projects',
    skills_offered: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'Docker', 'System Architecture'],
    skills_needed: ['Rust', 'PyTorch', 'Mobile Apps'],
    preferred_categories: ['Developer Tools & CLIs', 'Web Applications', 'AI / Machine Learning'],
    total_points: 450,
    current_streak: 5,
    longest_streak: 12,
    qualifying_contributions_count: 8,
    is_public: true
  });

  // 2. Fetch technologies map
  const { data: techs } = await supabase.from('technologies').select('id, name, slug');
  const techMap = new Map();
  techs?.forEach(t => techMap.set(t.slug, t.id));

  // 3. Projects data
  const sampleProjects = [
    {
      creator_id: adminId,
      title: 'OmniRoute — High-Throughput Edge API Gateway',
      slug: 'omniroute-edge-api-gateway',
      tagline: 'Ultra-low-latency reverse proxy and API rate-limiter running on cloud edge workers.',
      description: `### Overview
OmniRoute is a zero-latency edge routing proxy engineered for modern microservices and serverless architectures. Built with TypeScript and Rust, it features distributed token-bucket rate limiting, automatic SSL offloading, and cryptographic HMAC token validation.

### Key Capabilities
- **Distributed Rate Limiting**: Global token synchronization using fast Redis atomic counters with local caching fallbacks.
- **Dynamic Routing Rules**: JSON-based path rewrite engine supporting regex matchers and variable substitution.
- **Observability**: Real-time request telemetry with structured JSON logging and OpenTelemetry trace propagation.

### Tech Stack
- Frontend Dashboard: Next.js 16 with Tailwind CSS
- Runtime Engine: Cloudflare Workers & Node.js
- State Store: Redis & PostgreSQL`,
      category: 'Developer Tools & CLIs',
      status: 'in_progress',
      github_url: 'https://github.com/Mohammed-Zaahid-Yassin/community-developer-hub',
      live_url: 'https://community-developer-hub.vercel.app',
      is_featured: true,
      featured_at: new Date().toISOString(),
      is_approved: true,
      average_rating: 4.8,
      rating_count: 5,
      likes_count: 14,
      comments_count: 3,
      technologies: ['nextjs', 'typescript', 'redis', 'docker', 'postgresql']
    },
    {
      creator_id: adminId,
      title: 'NeuroCanvas — Collaborative AI Flow Visualizer',
      slug: 'neurocanvas-ai-flow-visualizer',
      tagline: 'Interactive infinite-canvas studio for architecting and evaluating multi-agent LLM graphs.',
      description: `### Problem
Visualizing complex multi-agent LLM systems with branching prompt topologies, tool calling, and human-in-the-loop interventions is difficult in raw code.

### Solution
NeuroCanvas provides an infinite graph studio where developers visually design, debug, and benchmark agent topologies in real time.

### Architecture
- React Flow canvas rendering with WebGL-accelerated node connections.
- WebSockets bidirectional streaming for LLM token generation updates.
- Export to Python (LangGraph) and TypeScript (Vercel AI SDK).`,
      category: 'AI / Machine Learning',
      status: 'looking_for_collaborators',
      github_url: 'https://github.com/Mohammed-Zaahid-Yassin/community-developer-hub',
      live_url: 'https://community-developer-hub.vercel.app',
      is_featured: true,
      featured_at: new Date(Date.now() - 86400000).toISOString(),
      is_approved: true,
      average_rating: 4.6,
      rating_count: 4,
      likes_count: 19,
      comments_count: 4,
      technologies: ['react', 'typescript', 'pytorch', 'python', 'tailwind-css']
    },
    {
      creator_id: adminId,
      title: 'PulseTelemetry — Lightweight Distributed Trace Collector',
      slug: 'pulsetelemetry-distributed-trace-collector',
      tagline: 'Zero-overhead observability agent for tracking service latencies across container clusters.',
      description: `### Why PulseTelemetry?
Most cloud observability vendors charge punitive egress costs and per-GB ingestion fees. PulseTelemetry is an open-source, single-binary daemon that captures OTel spans, aggregates percentiles locally, and writes directly to Parquet files or PostgreSQL.`,
      category: 'Cloud & DevOps',
      status: 'completed',
      github_url: 'https://github.com/Mohammed-Zaahid-Yassin/community-developer-hub',
      live_url: 'https://community-developer-hub.vercel.app',
      is_featured: false,
      is_approved: true,
      average_rating: 4.9,
      rating_count: 7,
      likes_count: 23,
      comments_count: 5,
      technologies: ['go', 'docker', 'postgresql', 'redis']
    },
    {
      creator_id: adminId,
      title: 'DevStreak — Gamified Open Source Contribution Tracker',
      slug: 'devstreak-gamified-contribution-tracker',
      tagline: 'Auditable engineering streak engine rewarding meaningful pull requests and code reviews.',
      description: `### The Problem with Vanity Metrics
GitHub green squares can be gamed with automated trivial commits. DevStreak introduces verifiable proof-of-engineering: streaks only increment on merged PRs, peer code reviews, or passed test suites.`,
      category: 'Web Applications',
      status: 'in_progress',
      github_url: 'https://github.com/Mohammed-Zaahid-Yassin/community-developer-hub',
      live_url: 'https://community-developer-hub.vercel.app',
      is_featured: false,
      is_approved: true,
      average_rating: 4.7,
      rating_count: 3,
      likes_count: 11,
      comments_count: 2,
      technologies: ['nextjs', 'typescript', 'supabase', 'tailwind-css']
    }
  ];

  for (const projData of sampleProjects) {
    const { technologies: projTechs, ...pPayload } = projData;

    // Check if exists
    const { data: existing } = await supabase.from('projects').select('id').eq('slug', pPayload.slug).maybeSingle();
    let projectId = existing?.id;

    if (!existing) {
      const { data: newProj, error: pErr } = await supabase.from('projects').insert(pPayload).select('id').single();
      if (pErr) {
        console.error('Error creating project:', pErr.message);
        continue;
      }
      projectId = newProj.id;
      console.log(`Created project: ${pPayload.title}`);
    } else {
      console.log(`Project already exists: ${pPayload.title}`);
    }

    // Link technologies
    if (projectId && projTechs) {
      for (const tSlug of projTechs) {
        const tId = techMap.get(tSlug);
        if (tId) {
          await supabase.from('project_technologies').upsert(
            { project_id: projectId, technology_id: tId },
            { onConflict: 'project_id,technology_id' }
          );
        }
      }
    }
  }

  // 4. Seed Collaboration Opportunities
  const { data: neuroProj } = await supabase.from('projects').select('id').eq('slug', 'neurocanvas-ai-flow-visualizer').single();
  const { data: omniProj } = await supabase.from('projects').select('id').eq('slug', 'omniroute-edge-api-gateway').single();

  if (neuroProj) {
    await supabase.from('collaboration_opportunities').upsert([
      {
        project_id: neuroProj.id,
        role_needed: 'Frontend Graph Visualizer Engineer',
        required_skills: ['React', 'TypeScript', 'Tailwind CSS'],
        positions_open: 2,
        responsibilities: 'Build interactive canvas components using React Flow, optimize drag-and-drop node reordering, and implement responsive connection lines.',
        time_commitment: '6-8 hours/week',
        location_type: 'remote',
        status: 'open'
      },
      {
        project_id: neuroProj.id,
        role_needed: 'Python / LangGraph Backend Specialist',
        required_skills: ['Python', 'PyTorch'],
        positions_open: 1,
        responsibilities: 'Implement schema serialization to export visual graphs into executable LangGraph and LangChain agent scripts.',
        time_commitment: '4-6 hours/week',
        location_type: 'remote',
        status: 'open'
      }
    ]);
    console.log('Seeded collaboration opportunities for NeuroCanvas');
  }

  if (omniProj) {
    await supabase.from('collaboration_opportunities').upsert([
      {
        project_id: omniProj.id,
        role_needed: 'DevOps & Benchmarking Engineer',
        required_skills: ['Docker', 'Go', 'PostgreSQL'],
        positions_open: 1,
        responsibilities: 'Write k6 load testing scripts, configure automated Docker build pipelines, and measure sub-millisecond p99 request latency.',
        time_commitment: '5 hours/week',
        location_type: 'remote',
        status: 'open'
      }
    ]);
    console.log('Seeded collaboration opportunities for OmniRoute');
  }

  // 5. Seed Challenges & Competitions
  const nextMonth = new Date(Date.now() + 86400000 * 30).toISOString();
  await supabase.from('challenges').upsert([
    {
      title: 'Zero-Cost Architecture Build Sprint',
      slug: 'zero-cost-architecture-sprint',
      tagline: 'Design and deploy a full-stack open-source app using only free-tier cloud resources ($0 / ₹0 budget).',
      description: 'Community challenge to build resilient, serverless applications utilizing generous free tiers (Vercel, Supabase, Cloudflare). Entries will be judged on technical implementation, practical utility, and documentation quality.',
      rules: '- Must deploy live on a public URL\n- Source code must be open-source\n- Strictly ₹0 infrastructure expenses\n- 5-minute video demo required',
      category: 'hackathon',
      banner_image: null,
      reward_points: 300,
      reward_badge: 'challenge_winner',
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: nextMonth,
      is_featured: true,
      max_participants: 100,
      created_by: adminId
    },
    {
      title: 'AI Developer Tooling & CLI Challenge',
      slug: 'ai-developer-tooling-challenge',
      tagline: 'Build a CLI or developer workflow tool integrating LLM agentic patterns.',
      description: 'Create an innovative command-line utility or IDE extension that eliminates repetitive developer friction.',
      rules: '- Written in TypeScript, Rust, or Python\n- Must include automated test suite\n- Clear installation instructions via npm or cargo',
      category: 'coding_challenge',
      banner_image: null,
      reward_points: 250,
      reward_badge: 'challenge_winner',
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: nextMonth,
      is_featured: false,
      max_participants: 50,
      created_by: adminId
    }
  ], { onConflict: 'slug' });
  console.log('Seeded Community Challenges');

  // 6. Seed Announcements
  await supabase.from('announcements').insert([
    {
      author_id: adminId,
      title: 'Welcome to the Community Developer Hub Platform!',
      content: 'The official platform is live. Members can now showcase their projects, apply for open collaboration roles, earn verified engineering streaks, and nominate projects for Community Spotlight.',
      is_pinned: true,
      published_at: new Date().toISOString()
    }
  ]);
  console.log('Seeded Announcements');

  console.log('Seeding complete! Database is fully populated with real developer community data.');
}

seedContent();
