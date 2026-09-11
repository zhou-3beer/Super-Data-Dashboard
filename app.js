const samplePayload = {
  issues: [
    {
      id: 101,
      subject: "認証まわりのUI確認",
      done_ratio: 100,
      status: { name: "完了" },
      assigned_to: { name: "Aki" },
      project: { name: "管理画面" },
      due_date: "2026-09-09"
    },
    {
      id: 102,
      subject: "売上グラフの最終調整",
      done_ratio: 80,
      status: { name: "進行中" },
      assigned_to: { name: "Mina" },
      project: { name: "ダッシュボード" },
      due_date: "2026-09-14"
    },
    {
      id: 103,
      subject: "CSV 出力のレイアウト修正",
      done_ratio: 45,
      status: { name: "レビュー待ち" },
      assigned_to: { name: "Ren" },
      project: { name: "帳票" },
      due_date: "2026-09-16"
    },
    {
      id: 104,
      subject: "月次KPI API 連携",
      done_ratio: 20,
      status: { name: "新規" },
      assigned_to: { name: "Yui" },
      project: { name: "分析基盤" },
      due_date: "2026-09-20"
    }
  ]
};

const bucketDefinitions = [
  { key: "notStarted", label: "0%〜24%", min: 0, max: 24 },
  { key: "early", label: "25%〜49%", min: 25, max: 49 },
  { key: "steady", label: "50%〜74%", min: 50, max: 74 },
  { key: "almostDone", label: "75%〜99%", min: 75, max: 99 },
  { key: "done", label: "100%", min: 100, max: 100 }
];

function clampRatio(value) {
  const ratio = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.min(100, Math.max(0, ratio));
}

function issueCollectionFrom(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && Array.isArray(value.issues)) {
    return value.issues;
  }

  throw new Error("`issues` 配列を含む Redmine JSON を入力してください。");
}

function formatPerson(value) {
  return value?.name || "未設定";
}

function formatProject(value) {
  return value?.name || "プロジェクト未設定";
}

export function parseRedmineData(text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("JSON の形式が正しくありません。Redmine の issues JSON をそのまま貼り付けてください。");
    }

    throw error;
  }

  return issueCollectionFrom(parsed).map((issue, index) => ({
    id: issue.id ?? index + 1,
    subject: issue.subject || `チケット ${index + 1}`,
    projectName: formatProject(issue.project),
    assigneeName: formatPerson(issue.assigned_to),
    statusName: issue.status?.name || "未設定",
    dueDate: issue.due_date || "未設定",
    doneRatio: clampRatio(issue.done_ratio)
  }));
}

export function buildProgressBuckets(issues) {
  const total = issues.length;
  const buckets = bucketDefinitions.map((bucket) => ({ ...bucket, count: 0, percentage: 0 }));

  for (const issue of issues) {
    const bucketIndex =
      issue.doneRatio === 100
        ? 4
        : issue.doneRatio >= 75
          ? 3
          : issue.doneRatio >= 50
            ? 2
            : issue.doneRatio >= 25
              ? 1
              : 0;

    buckets[bucketIndex].count += 1;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    percentage: total ? Math.round((bucket.count / total) * 100) : 0
  }));
}

export function summarizeIssues(issues) {
  const total = issues.length;
  const totalDoneRatio = issues.reduce((sum, issue) => sum + issue.doneRatio, 0);
  const completedCount = issues.filter((issue) => issue.doneRatio === 100).length;
  const inProgressCount = issues.filter(
    (issue) => issue.doneRatio >= 25 && issue.doneRatio < 100
  ).length;
  const attentionCount = issues.filter((issue) => issue.doneRatio < 50).length;

  return {
    total,
    overallProgress: total ? Math.round(totalDoneRatio / total) : 0,
    completedCount,
    inProgressCount,
    attentionCount,
    buckets: buildProgressBuckets(issues)
  };
}

function renderBucketList(container, buckets) {
  container.replaceChildren(
    ...buckets.map((bucket) => {
      const card = document.createElement("section");
      const header = document.createElement("div");
      const title = document.createElement("strong");
      const count = document.createElement("span");
      const track = document.createElement("div");
      const fill = document.createElement("div");

      card.className = "bucket-card";
      header.className = "bucket-header";
      track.className = "mini-progress-track";
      fill.className = "mini-progress-fill";
      track.setAttribute("aria-hidden", "true");

      title.textContent = bucket.label;
      count.textContent = `${bucket.count} 件`;
      fill.style.width = `${bucket.percentage}%`;

      header.append(title, count);
      track.append(fill);
      card.append(header, track);

      return card;
    })
  );
}

function renderIssueTable(body, issues) {
  const sortedIssues = [...issues].sort((left, right) => left.doneRatio - right.doneRatio);

  body.replaceChildren(
    ...sortedIssues.map((issue) => {
      const row = document.createElement("tr");
      const ticketCell = document.createElement("td");
      const assigneeCell = document.createElement("td");
      const statusCell = document.createElement("td");
      const progressCell = document.createElement("td");
      const dueDateCell = document.createElement("td");
      const title = document.createElement("span");
      const meta = document.createElement("span");
      const badge = document.createElement("span");
      const progressHeader = document.createElement("div");
      const progressValue = document.createElement("span");
      const progressTrack = document.createElement("div");
      const progressFill = document.createElement("div");

      title.className = "ticket-title";
      meta.className = "ticket-meta";
      badge.className = "badge";
      progressHeader.className = "progress-cell";
      progressTrack.className = "mini-progress-track";
      progressFill.className = "mini-progress-fill";
      progressTrack.setAttribute("aria-hidden", "true");

      title.textContent = issue.subject;
      meta.textContent = `#${issue.id} / ${issue.projectName}`;
      assigneeCell.textContent = issue.assigneeName;
      badge.textContent = issue.statusName;
      progressValue.textContent = `${issue.doneRatio}%`;
      progressFill.style.width = `${issue.doneRatio}%`;
      dueDateCell.textContent = issue.dueDate;

      ticketCell.append(title, meta);
      statusCell.append(badge);
      progressHeader.append(progressValue);
      progressTrack.append(progressFill);
      progressCell.append(progressHeader, progressTrack);
      row.append(ticketCell, assigneeCell, statusCell, progressCell, dueDateCell);

      return row;
    })
  );
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderDashboard(issues) {
  const summary = summarizeIssues(issues);
  const overallProgressBar = document.getElementById("overallProgressBar");

  setText("overallProgressValue", `${summary.overallProgress}%`);
  setText("completedValue", String(summary.completedCount));
  setText("completedDetail", `${summary.total} 件中`);
  setText("inProgressValue", String(summary.inProgressCount));
  setText("attentionValue", String(summary.attentionCount));
  setText("issueCount", `${summary.total} 件`);
  overallProgressBar.style.width = `${summary.overallProgress}%`;

  renderBucketList(document.getElementById("bucketList"), summary.buckets);
  renderIssueTable(document.getElementById("issueTableBody"), issues);
}

function attachDashboard() {
  const dataInput = document.getElementById("dataInput");
  const renderButton = document.getElementById("renderButton");
  const sampleButton = document.getElementById("sampleButton");
  const errorMessage = document.getElementById("errorMessage");

  const updateDashboard = () => {
    try {
      const issues = parseRedmineData(dataInput.value);
      errorMessage.textContent = "";
      renderDashboard(issues);
    } catch (error) {
      errorMessage.textContent =
        error instanceof Error
          ? error.message
          : "JSON を読み込めませんでした。Redmine の issues JSON を確認してください。";
    }
  };

  dataInput.value = JSON.stringify(samplePayload, null, 2);
  renderButton.addEventListener("click", updateDashboard);
  sampleButton.addEventListener("click", () => {
    dataInput.value = JSON.stringify(samplePayload, null, 2);
    updateDashboard();
  });

  updateDashboard();
}

if (typeof document !== "undefined") {
  attachDashboard();
}
