import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { starSummaries } from "./star-summaries.mjs";

const token = process.env.GITHUB_TOKEN;
const login = process.env.GITHUB_LOGIN || process.env.GITHUB_REPOSITORY_OWNER;

if (!token || !login) {
  throw new Error("GITHUB_TOKEN and GITHUB_LOGIN must be set.");
}

const categories = [
  {
    title: "AI 编程与 Agent",
    description: "编程智能体、Agent 桌面端、提示词与 Skills、任务编排和代码理解工具。",
    repos: [
      "agentscope-ai/agentscope",
      "agentscope-ai/QwenPaw",
      "AIsa-team/agent-foyer",
      "BigPizzaV3/CodexPlusPlus",
      "chen0416ccc-cpu/codex-windows-fast-patch-skill",
      "CherryHQ/cherry-studio",
      "colbymchenry/codegraph",
      "Ebony-Vinyl/dsh-our-free-model",
      "farion1231/cc-switch",
      "getpaseo/paseo",
      "herdrdev/herdr",
      "Jia-Ethan/codex-keysmith",
      "Jia-Ethan/keysmith-switch",
      "Jia-Ethan/zcode-keysmith",
      "jlcodes99/cockpit-tools",
      "Kaka-cheaper/codeSee",
      "Kuddev/pebrel",
      "lsdefine/GenericAgent",
      "omnimind-ai/OmniBot",
      "sickn33/agentic-awesome-skills",
      "slopus/happy",
      "spacering-net/codeg",
      "sqfcyily/deva",
      "stablyai/orca",
      "Stack-Cairn/LiveAgent",
      "useLexora/Lexora",
      "vastsa/PI-Desktop",
      "yynxxxxx/Codex-X",
      "zhukunpenglinyutong/desktop-cc-gui",
      "ZiChuanLan/agent-purge",
    ],
  },
  {
    title: "模型接入与 API 网关",
    description: "多账号管理、OpenAI/Claude/Gemini 兼容网关、模型路由、额度与价格工具。",
    repos: [
      "AiXiaoc/codar2api",
      "ardeyouxipianyi/workbuddy2api-hub",
      "bestruirui/octopus",
      "chenyme/grok2api",
      "cita-777/metapi",
      "decolua/9router",
      "dimthink/PriceAI",
      "ding113/claude-code-hub",
      "Hello-Application-XH/HelloGML",
      "lidge-jun/opencodex",
      "linguo2625469/workbuddy2api-panel",
      "looplj/axonhub",
      "mmparko/dsh-purge",
      "pjpv/zcode-switch",
      "qixing-jk/all-api-hub",
      "QLHazyCoder/FlowPilot",
      "QuantumNous/new-api",
      "rheodev/cpa-plugin-privacyfilter",
      "router-for-me/CLIProxyAPI",
      "TheSmallHanCat/flow2api",
      "ThinkWatchProject/ThinkWatch-Core",
      "ThinkWatchProject/ThinkWatch-Lite",
      "TriDefender/zcode-api",
      "WizisCool/oh-my-cpa",
      "yetone/magpie",
      "yetone/magpie-releases",
      "yexi-by/dsh-unrestricted",
    ],
  },
  {
    title: "安全、逆向与红队",
    description: "逆向工程、JS/小程序分析、代码审计、CTF、渗透测试、红队与安全 Skills。",
    subgroups: [
      {
        title: "逆向工程与代码分析",
        repos: [
          "biggerstar/wedecode",
          "wux1an/wxapkg",
          "echo094/decode-js",
          "masterqiu01/cross-file-obfuscator",
          "morluto/rea",
          "zhizhuodemao/js-reverse-mcp",
          "LING71671/open-reverselab",
          "angusdevgo/Seep-Reverse-Lab",
          "vmoranv/jshookmcp",
          "vibe-coding-labs/zcodeReverseEngineering",
          "BuluBulugege/Free-BAI",
        ],
      },
      {
        title: "渗透测试与红队",
        repos: [
          "AIPentest/CyberStrikeAI",
          "kkbo8005/mitan",
          "yv1ing/Z3r0",
          "SeaC-25/Kali-Security-MCP",
          "Esonhugh/pydoll-cf-waf-bypasser-skills",
        ],
      },
      {
        title: "CTF 与安全 Skills",
        repos: [
          "asdfgh1445/ctf-super-hub",
          "GALIAIS/CTF-Sandbox-Orchestrator",
          "ljagiello/ctf-skills",
          "mukul975/Anthropic-Cybersecurity-Skills",
          "P4nda0s/reverse-skills",
          "zhaoxuya520/reverse-skill",
        ],
      },
    ],
  },
  {
    title: "AI 多媒体创作",
    description: "短剧、漫剧、视频、图像、配音、音乐和可视化创作工作流。",
    repos: [
      "eternityspring/shuohao-skills",
      "HBAI-Ltd/Toonflow-app",
      "heshengtao/comfyui_LLM_party",
      "leemysw/yovoice",
      "shijue-aid/aid-studio",
      "yuqie6/ProductFlow",
    ],
  },
  {
    title: "微信、小程序与协议自动化",
    description: "微信机器人、小程序协议、账号自动化与远程控制入口。",
    repos: [
      "525815266/YYB-Go-Enhanced",
      "lcmovie/YYB-GO-Script-i",
      "SMNETSTUDIO/WeChat-AI",
      "sourcepro5/WeChatAgent",
      "uluckyXH/Chat-Codex",
    ],
  },
  {
    title: "网络代理、浏览器与隐私",
    description: "代理网关、分流规则、指纹浏览器、定位工具和 AI 浏览器自动化。",
    repos: [
      "black-ant/Ant-Browser",
      "BOBOLAOSHIV587/Rules",
      "Cd1s/safarier",
      "crossutility/Quantumult-X",
      "epiral/bb-browser",
      "fjh1997/Linux.do-Accelerator",
      "ios151/wloc",
      "loc567/loc567",
      "luestr/ProxyResource",
      "lushier888/QX-Surge-Loon-Shadowrocket",
      "Moli-X/Resources",
      "omegaee/my-fingerprint",
      "RagBagCN/QuantumultX",
      "Resinat/Resin",
      "SagerNet/sing-box",
      "sleepinginsummer/agent-browser-cli",
      "vercel-labs/agent-browser",
    ],
  },
  {
    title: "桌面应用与系统工具",
    description: "桌面客户端、输入法、字体、系统增强、远程管理和开发效率工具。",
    includeOwnedRepositories: true,
    repos: [
      "androidcn/userscripts",
      "bggRGjQaUbCoE/PiliPlus",
      "daimiaopeng/coolapk-desktop",
      "Eilgnaw/dexo",
      "fivif/sshc",
      "Jyy1529/claude-desktop_win-zh_cn",
      "komi-store/komi-store",
      "leleji/CtYun",
      "Lingyan000/fluxdo",
      "lizhian/github-trending-tracking",
      "miloquinn/origo-x",
      "moliango/doer",
      "nakixii/Magisk_AsoulOpt",
      "nanvon/hachibu",
      "NSRingo/iRingo",
      "OrdoEden/Galchat",
      "qingjian-team/qingjian",
      "scholay-xsime/xsime",
      "srwi/EverythingToolbar",
      "subframe7536/maple-font",
      "webhtv/webhtv",
    ],
  },
  {
    title: "阅读、学习与生活",
    description: "阅读器、英语学习、题库、健身和长期学习资料。",
    repos: [
      "byoungd/up",
      "chunsi-w/ielts-dict-source-code",
      "DuarteSantos8/openGym",
      "freeok/so-novel",
      "huamurui/zhihu-minus-minus",
      "infinityf4p/TiebaPure-iOS",
      "o-Sakurajimamai-o/cet-practice",
      "wssfk12138/android-english-multiple-choice-practice-machine",
    ],
  },
  {
    title: "用途待确认",
    description: "仓库简介缺失，暂时无法可靠归类。",
    repos: ["aleotoidayy/nghluan"],
  },
];

const starred = await fetchStarredRepositories();
const repoMap = new Map(starred.map((repo) => [repo.full_name.toLowerCase(), repo]));
const assigned = new Set();
const sections = [];
const missingSummaries = starred.filter(
  (repo) => repo.owner.login !== login && !starSummaries[repo.full_name.toLowerCase()],
);

if (missingSummaries.length) {
  console.warn(`Missing Chinese summaries: ${missingSummaries.map((repo) => repo.full_name).join(", ")}`);
}

for (const category of categories) {
  const groups = category.subgroups || [{ title: null, repos: category.repos }];
  const renderedGroups = [];

  for (const group of groups) {
    const groupRepos = group.repos.map((name) => claimRepository(name)).filter(Boolean);
    if (groupRepos.length) {
      renderedGroups.push({ title: group.title, repos: sortRepositories(groupRepos) });
    }
  }

  if (category.includeOwnedRepositories) {
    const owned = starred.filter((repo) => repo.owner.login === login && !assigned.has(repo.full_name.toLowerCase()));
    for (const repo of owned) {
      assigned.add(repo.full_name.toLowerCase());
    }
    if (owned.length) {
      renderedGroups.push({ title: null, repos: sortRepositories(owned) });
    }
  }

  const total = renderedGroups.reduce((sum, group) => sum + group.repos.length, 0);
  if (total) {
    sections.push({ ...category, groups: renderedGroups, total });
  }
}

const unassigned = starred.filter((repo) => !assigned.has(repo.full_name.toLowerCase()));
if (unassigned.length) {
  sections.push({
    title: "新增待整理",
    description: "本次抓取到但尚未配置主分类的收藏。",
    groups: [{ title: null, repos: sortRepositories(unassigned) }],
    total: unassigned.length,
  });
}

const generatedAt = new Date().toISOString().slice(0, 10);
const totalCount = sections.reduce((sum, section) => sum + section.total, 0);
const markdown = buildMarkdown({ sections, totalCount, generatedAt });

await writeFile(resolve("STARS.md"), markdown, "utf8");
console.log(`Generated STARS.md with ${totalCount} starred repositories.`);

function claimRepository(fullName) {
  const key = fullName.toLowerCase();
  const repo = repoMap.get(key);
  if (!repo) {
    console.warn(`Skipped missing repository: ${fullName}`);
    return null;
  }
  if (assigned.has(key)) {
    throw new Error(`Repository appears in more than one category: ${fullName}`);
  }
  assigned.add(key);
  return repo;
}

function sortRepositories(repositories) {
  return [...repositories].sort(
    (left, right) =>
      right.stargazers_count - left.stargazers_count ||
      left.full_name.localeCompare(right.full_name, "en"),
  );
}

async function fetchStarredRepositories() {
  const repositories = [];

  for (let page = 1; ; page += 1) {
    const response = await fetch(`https://api.github.com/user/starred?per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "star-index-generator",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${await response.text()}`);
    }

    const pageRepositories = await response.json();
    repositories.push(...pageRepositories);

    if (pageRepositories.length < 100) {
      break;
    }
  }

  return repositories;
}

function buildMarkdown({ sections, totalCount, generatedAt }) {
  const countWidth = String(totalCount).length;
  const summaryRows = sections
    .map(
      (section, index) =>
        `| ${String(index + 1).padStart(2, "0")} | [${section.title}](#category-${String(index + 1).padStart(2, "0")}) | ${String(section.total).padStart(countWidth, " ")} |`,
    )
    .join("\n");

  const categoryBlocks = sections
    .map((section, index) => {
      const groups = section.groups
        .map((group) => {
          const heading = group.title ? `### ${group.title}\n\n` : "";
          const items = group.repos.map(renderRepository).join("\n");
          return `${heading}${items}`;
        })
        .join("\n\n");

      const categoryNumber = String(index + 1).padStart(2, "0");
      return `<a id="category-${categoryNumber}"></a>

## ${categoryNumber} / ${section.title}

${section.description}

<sub>${section.total} 个项目</sub>

${groups}`;
    })
    .join("\n\n---\n\n");

  return `<div align="center">

# 我的 Star 项目库

**${totalCount} 个收藏项目，按主要用途分类整理。**

<sub>最后整理：${generatedAt} · 每个项目仅归入一个主分类</sub>

</div>

> [!NOTE]
> “安全、逆向与红队”包含逆向工程、JS/小程序分析、代码审计、CTF、渗透测试和安全 Skills。<br />
> 一个项目可能同时涉及多个领域，这里按照它最核心的用途归类；每项都配有简短中文用途说明。

## 分类索引

| 编号 | 分类 | 数量 |
|:---:|---|---:|
${summaryRows}

---

${categoryBlocks}

---

<div align="center">
  <sub>Generated from GitHub Stars · Maintained by ${login}</sub>
</div>
`;
}

function renderRepository(repo) {
  const language = repo.language || "未标注";
  const stars = new Intl.NumberFormat("en-US").format(repo.stargazers_count);
  const description = sanitizeDescription(getSummary(repo));
  return `- **[${repo.full_name}](${repo.html_url})** · \`${language}\` · ★ ${stars}${description ? ` — ${description}` : ""}`;
}

function getSummary(repo) {
  if (repo.owner.login === login) {
    return "Cursor 与 Claude Desktop 的中文本地化工作台，强调版本识别、强制备份、一键汉化和原版恢复。";
  }
  return starSummaries[repo.full_name.toLowerCase()] || repo.description || "";
}

function sanitizeDescription(description) {
  if (!description) {
    return "";
  }
  return description
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replace(/\s+/g, " ")
    .trim();
}
