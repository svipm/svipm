import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const token = process.env.GITHUB_TOKEN;
const login = process.env.GITHUB_LOGIN || process.env.GITHUB_REPOSITORY_OWNER;

if (!token || !login) {
  throw new Error("GITHUB_TOKEN and GITHUB_LOGIN must be set.");
}

const query = `
  query ProfileWidgets($login: String!) {
    user(login: $login) {
      followers {
        totalCount
      }
      repositories(privacy: PUBLIC, first: 100, ownerAffiliations: OWNER) {
        totalCount
        nodes {
          name
          isFork
          isArchived
          stargazerCount
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "profile-widget-generator",
  },
  body: JSON.stringify({ query, variables: { login } }),
});

const payload = await response.json();

if (!response.ok || payload.errors?.length) {
  throw new Error(JSON.stringify(payload.errors || payload, null, 2));
}

const user = payload.data.user;
const repositories = user.repositories.nodes.filter(Boolean);
const publicStars = repositories.reduce((total, repo) => total + repo.stargazerCount, 0);
const contributionDays = user.contributionsCollection.contributionCalendar.weeks.flatMap((week) =>
  week.contributionDays,
);
const contributionWeeks = user.contributionsCollection.contributionCalendar.weeks.map((week) =>
  week.contributionDays.reduce((total, day) => total + day.contributionCount, 0),
);

const languageSizes = new Map();
for (const repo of repositories) {
  if (repo.isFork || repo.isArchived) {
    continue;
  }
  for (const edge of repo.languages.edges) {
    languageSizes.set(edge.node.name, (languageSizes.get(edge.node.name) || 0) + edge.size);
  }
}

const allLanguages = [...languageSizes.entries()]
  .map(([name, size]) => ({ name, size }))
  .sort((a, b) => b.size - a.size);
const totalLanguageBytes = allLanguages.reduce((total, language) => total + language.size, 0);
const palette = ["#FF5C35", "#B8F26E", "#F7F1E5", "#94A08B", "#D9A441", "#C97B63"];
const topLanguages = allLanguages.slice(0, 5);
const topLanguageBytes = topLanguages.reduce((total, language) => total + language.size, 0);

if (totalLanguageBytes > topLanguageBytes) {
  topLanguages.push({ name: "Other", size: totalLanguageBytes - topLanguageBytes });
}

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const formatNumber = new Intl.NumberFormat("en-US").format;
const updatedAt = new Date().toISOString().slice(0, 10);
const contributionBars = createContributionBars(contributionWeeks);
const momentum = buildMomentum(contributionDays);

const statsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300" viewBox="0 0 1200 300" role="img" aria-labelledby="title desc">
  <title id="title">Live GitHub profile statistics for ${escapeXml(login)}</title>
  <desc id="desc">${formatNumber(user.followers.totalCount)} followers, ${formatNumber(publicStars)} public stars, ${formatNumber(user.repositories.totalCount)} public repositories, and ${formatNumber(user.contributionsCollection.contributionCalendar.totalContributions)} contributions in the last year.</desc>
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1200" y2="300" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8F2E7"/>
      <stop offset="1" stop-color="#EADFCB"/>
    </linearGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" fill="none" stroke="#171914" stroke-opacity=".05"/>
    </pattern>
    <clipPath id="frame">
      <rect width="1200" height="300" rx="26"/>
    </clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="1200" height="300" fill="url(#paper)"/>
    <rect width="1200" height="300" fill="url(#grid)"/>
    <circle cx="1100" cy="20" r="160" fill="none" stroke="#171914" stroke-opacity=".055" stroke-width="36"/>
    <text x="48" y="43" fill="#171914" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="700" letter-spacing="2.2">LIVE SIGNAL / GITHUB DATA</text>
    <circle cx="275" cy="39" r="4" fill="#FF5C35"/>
    <text x="288" y="43" fill="#656A60" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.2">REFRESHED DAILY</text>
    <text x="1152" y="43" fill="#656A60" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.2" text-anchor="end">UPDATED ${updatedAt}</text>
    <line x1="48" y1="62" x2="1152" y2="62" stroke="#171914" stroke-opacity=".14"/>

    <g>
      <text x="48" y="142" fill="#171914" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700">${formatNumber(publicStars)}</text>
      <text x="50" y="170" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.7">PUBLIC STARS</text>
    </g>
    <line x1="292" y1="86" x2="292" y2="182" stroke="#171914" stroke-opacity=".12"/>
    <g>
      <text x="324" y="142" fill="#171914" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700">${formatNumber(user.followers.totalCount)}</text>
      <text x="326" y="170" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.7">FOLLOWERS</text>
    </g>
    <line x1="568" y1="86" x2="568" y2="182" stroke="#171914" stroke-opacity=".12"/>
    <g>
      <text x="600" y="142" fill="#171914" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700">${formatNumber(user.repositories.totalCount)}</text>
      <text x="602" y="170" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.7">PUBLIC REPOS</text>
    </g>
    <line x1="844" y1="86" x2="844" y2="182" stroke="#171914" stroke-opacity=".12"/>
    <g>
      <text x="876" y="142" fill="#171914" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700">${formatNumber(user.contributionsCollection.contributionCalendar.totalContributions)}</text>
      <text x="878" y="170" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.7">CONTRIBUTIONS / 1Y</text>
    </g>

    <text x="48" y="213" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="9" letter-spacing="1.5">365-DAY CONTRIBUTION RHYTHM</text>
    <g transform="translate(48 225)">
      ${contributionBars}
    </g>
    <line x1="48" y1="276" x2="1152" y2="276" stroke="#171914" stroke-opacity=".2"/>
  </g>
</svg>`;

const languageSvg = buildLanguageSvg({
  languages: topLanguages,
  totalLanguageBytes,
  publicRepositories: user.repositories.totalCount,
  updatedAt,
});
const momentumSvg = buildMomentumSvg({ momentum, updatedAt });

const outputDirectory = resolve("assets");
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "profile-stats.svg"), statsSvg, "utf8");
await writeFile(resolve(outputDirectory, "language-map.svg"), languageSvg, "utf8");
await writeFile(resolve(outputDirectory, "momentum.svg"), momentumSvg, "utf8");

console.log(`Generated profile widgets for ${login}.`);

function createContributionBars(weekTotals) {
  if (!weekTotals.length) {
    return "";
  }

  const chartWidth = 1104;
  const chartHeight = 38;
  const gap = 7;
  const barWidth = Math.max(5, (chartWidth - gap * (weekTotals.length - 1)) / weekTotals.length);
  const max = Math.max(...weekTotals, 1);

  return weekTotals
    .map((count, index) => {
      const height = Math.max(2, (count / max) * chartHeight);
      const x = index * (barWidth + gap);
      const y = chartHeight - height;
      const fill = index >= weekTotals.length - 8 ? "#FF5C35" : "#171914";
      const opacity = index >= weekTotals.length - 8 ? "0.9" : "0.22";
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" rx="2" fill="${fill}" fill-opacity="${opacity}"/>`;
    })
    .join("");
}

function buildMomentum(days) {
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let activeDays = 0;
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

  for (let index = days.length - 1; index >= 0 && days[index].contributionCount > 0; index -= 1) {
    currentStreak += 1;
  }

  for (const day of days) {
    if (day.contributionCount > 0) {
      activeDays += 1;
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    weekdayTotals[weekday] += day.contributionCount;
  }

  const topWeekdayIndex = weekdayTotals.indexOf(Math.max(...weekdayTotals));
  const recentDays = days.slice(-28);
  const recentMax = Math.max(...recentDays.map((day) => day.contributionCount), 1);
  const recentTotal = recentDays.reduce((total, day) => total + day.contributionCount, 0);

  return {
    currentStreak,
    longestStreak,
    activeDays,
    topWeekday: weekdayNames[topWeekdayIndex],
    recentDays,
    recentMax,
    recentTotal,
  };
}

function buildLanguageSvg({ languages, totalLanguageBytes, publicRepositories, updatedAt: generatedAt }) {
  const width = 1200;
  const barX = 58;
  const barY = 113;
  const barWidth = 778;
  const barHeight = 30;
  let cursor = barX;

  const segments = languages
    .map((language, index) => {
      const share = totalLanguageBytes ? language.size / totalLanguageBytes : 0;
      const segmentWidth = share * barWidth;
      const color = palette[index % palette.length];
      const percentage = `${(share * 100).toFixed(1)}%`;
      const segment = `<rect x="${cursor.toFixed(2)}" y="${barY}" width="${Math.max(segmentWidth, 2).toFixed(2)}" height="${barHeight}" fill="${color}"/>`;
      cursor += segmentWidth;
      return { segment, percentage, color, name: language.name, index };
    });

  const top = languages[0] || { name: "N/A", size: 0 };
  const topShare = totalLanguageBytes ? (top.size / totalLanguageBytes) * 100 : 0;
  const legend = segments
    .map(({ name, percentage, color, index }) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 58 + column * 330;
      const y = 202 + row * 28;
      return `<circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${color}"/>
    <text x="${x + 20}" y="${y}" fill="#D8DDD2" font-family="Consolas, 'Courier New', monospace" font-size="11" letter-spacing="1">${escapeXml(name.toUpperCase())} / ${percentage}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="270" viewBox="0 0 ${width} 270" role="img" aria-labelledby="title desc">
  <title id="title">Public repository language index</title>
  <desc id="desc">Language composition across public source repositories, led by ${escapeXml(top.name)} at ${topShare.toFixed(1)} percent.</desc>
  <defs>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M28 0H0V28" fill="none" stroke="#F7F1E5" stroke-opacity=".055"/>
    </pattern>
    <clipPath id="frame">
      <rect width="${width}" height="270" rx="26"/>
    </clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${width}" height="270" fill="#171914"/>
    <rect width="${width}" height="270" fill="url(#grid)"/>
    <text x="58" y="52" fill="#B8F26E" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="700" letter-spacing="2.2">LANGUAGE INDEX / PUBLIC SOURCE</text>
    <text x="1142" y="52" fill="#8F9588" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.2" text-anchor="end">${publicRepositories} PUBLIC REPOS / UPDATED ${generatedAt}</text>
    <text x="58" y="90" fill="#F7F1E5" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700">WHAT THE CODE IS MADE OF</text>
    <text x="930" y="90" fill="#8F9588" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.2">${formatNumber(totalLanguageBytes)} BYTES INDEXED</text>

    <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="4" fill="#2B2E27"/>
    <g clip-path="url(#languageBarClip)">${segments.map(({ segment }) => segment).join("")}</g>
    <line x1="${barX}" y1="${barY + barHeight + 15}" x2="${barX + barWidth}" y2="${barY + barHeight + 15}" stroke="#F7F1E5" stroke-opacity=".12"/>

    ${legend}

    <line x1="884" y1="112" x2="884" y2="248" stroke="#F7F1E5" stroke-opacity=".14"/>
    <text x="924" y="132" fill="#8F9588" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.6">TOP LANGUAGE</text>
    <text x="924" y="185" fill="#B8F26E" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-weight="700">${escapeXml(top.name.toUpperCase())}</text>
    <text x="924" y="228" fill="#F7F1E5" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-weight="700">${topShare.toFixed(1)}%</text>
    <text x="924" y="246" fill="#8F9588" font-family="Consolas, 'Courier New', monospace" font-size="9" letter-spacing="1.3">OF PUBLIC SOURCE BYTES</text>
  </g>
  <defs>
    <clipPath id="languageBarClip">
      <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="4"/>
    </clipPath>
  </defs>
</svg>`;
}

function buildMomentumSvg({ momentum: data, updatedAt: generatedAt }) {
  const heatmapX = 166;
  const heatmapY = 155;
  const cellWidth = 29;
  const cellHeight = 22;
  const gap = 6;
  const cells = data.recentDays
    .map((day, index) => {
      const level = day.contributionCount === 0 ? 0 : Math.max(1, Math.ceil((day.contributionCount / data.recentMax) * 4));
      const colors = ["#171914", "#FFD0C5", "#FF9C7F", "#FF7958", "#FF5C35"];
      const opacity = level === 0 ? "0.08" : level === 1 ? "0.72" : "1";
      const x = heatmapX + index * (cellWidth + gap);
      return `<rect x="${x}" y="${heatmapY}" width="${cellWidth}" height="${cellHeight}" rx="4" fill="${colors[level]}" fill-opacity="${opacity}"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="220" viewBox="0 0 1200 220" role="img" aria-labelledby="title desc">
  <title id="title">Contribution momentum</title>
  <desc id="desc">${data.currentStreak} day current streak, ${data.longestStreak} day longest streak, ${data.activeDays} active days, and ${data.recentTotal} contributions in the last 28 days.</desc>
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1200" y2="220" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8F2E7"/>
      <stop offset="1" stop-color="#ECE2D0"/>
    </linearGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" fill="none" stroke="#171914" stroke-opacity=".05"/>
    </pattern>
    <clipPath id="frame">
      <rect width="1200" height="220" rx="24"/>
    </clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="1200" height="220" fill="url(#paper)"/>
    <rect width="1200" height="220" fill="url(#grid)"/>
    <text x="48" y="42" fill="#171914" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="700" letter-spacing="2.2">CONTRIBUTION MOMENTUM / 365 DAYS</text>
    <text x="1152" y="42" fill="#656A60" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.2" text-anchor="end">${data.topWeekday} IS MOST ACTIVE</text>
    <line x1="48" y1="60" x2="1152" y2="60" stroke="#171914" stroke-opacity=".14"/>

    <text x="48" y="107" fill="#171914" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="700">${data.currentStreak}</text>
    <text x="50" y="128" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="9" letter-spacing="1.4">CURRENT STREAK</text>
    <line x1="278" y1="74" x2="278" y2="132" stroke="#171914" stroke-opacity=".12"/>
    <text x="314" y="107" fill="#171914" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="700">${data.longestStreak}</text>
    <text x="316" y="128" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="9" letter-spacing="1.4">LONGEST STREAK</text>
    <line x1="550" y1="74" x2="550" y2="132" stroke="#171914" stroke-opacity=".12"/>
    <text x="586" y="107" fill="#171914" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="700">${data.activeDays}</text>
    <text x="588" y="128" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="9" letter-spacing="1.4">ACTIVE DAYS</text>
    <line x1="822" y1="74" x2="822" y2="132" stroke="#171914" stroke-opacity=".12"/>
    <text x="858" y="107" fill="#171914" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="700">${data.recentTotal}</text>
    <text x="860" y="128" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="9" letter-spacing="1.4">LAST 28 DAYS</text>

    <text x="48" y="171" fill="#5C6157" font-family="Consolas, 'Courier New', monospace" font-size="9" letter-spacing="1.3">DAILY RHYTHM</text>
    ${cells}
    <text x="1152" y="201" fill="#656A60" font-family="Consolas, 'Courier New', monospace" font-size="9" letter-spacing="1.1" text-anchor="end">UPDATED ${generatedAt}</text>
  </g>
</svg>`;
}
