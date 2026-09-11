import test from "node:test";
import assert from "node:assert/strict";

import { buildProgressBuckets, parseRedmineData, summarizeIssues } from "./app.js";

test("parseRedmineData accepts Redmine issue responses", () => {
  const issues = parseRedmineData(
    JSON.stringify({
      issues: [
        {
          id: 10,
          subject: "API 実装",
          done_ratio: 140,
          status: { name: "完了" },
          assigned_to: { name: "Kai" },
          project: { name: "管理画面" },
          due_date: "2026-09-12"
        },
        {
          id: 11,
          done_ratio: -5
        }
      ]
    })
  );

  assert.deepEqual(issues, [
    {
      id: 10,
      subject: "API 実装",
      projectName: "管理画面",
      assigneeName: "Kai",
      statusName: "完了",
      dueDate: "2026-09-12",
      doneRatio: 100
    },
    {
      id: 11,
      subject: "チケット 2",
      projectName: "プロジェクト未設定",
      assigneeName: "未設定",
      statusName: "未設定",
      dueDate: "未設定",
      doneRatio: 0
    }
  ]);
});

test("parseRedmineData also accepts a direct issue array", () => {
  const issues = parseRedmineData(
    JSON.stringify([
      {
        id: 21,
        subject: "直接配列の確認",
        done_ratio: 60
      }
    ])
  );

  assert.equal(issues[0].id, 21);
  assert.equal(issues[0].subject, "直接配列の確認");
  assert.equal(issues[0].doneRatio, 60);
});

test("summarizeIssues returns overall progress counts", () => {
  const issues = [
    { doneRatio: 100 },
    { doneRatio: 80 },
    { doneRatio: 45 },
    { doneRatio: 20 }
  ];

  assert.deepEqual(summarizeIssues(issues), {
    total: 4,
    overallProgress: 61,
    completedCount: 1,
    inProgressCount: 1,
    attentionCount: 2,
    buckets: buildProgressBuckets(issues)
  });
});

test("summarizeIssues keeps summary ranges consistent at boundaries", () => {
  const summary = summarizeIssues([
    { doneRatio: 25 },
    { doneRatio: 49 },
    { doneRatio: 50 },
    { doneRatio: 99 },
    { doneRatio: 100 }
  ]);

  assert.equal(summary.inProgressCount, 2);
  assert.equal(summary.attentionCount, 2);
  assert.equal(summary.completedCount, 1);
});

test("parseRedmineData rejects unsupported payloads", () => {
  assert.throws(
    () => parseRedmineData(JSON.stringify({ items: [] })),
    /issues/
  );
});

test("parseRedmineData shows a friendly message for malformed JSON", () => {
  assert.throws(
    () => parseRedmineData("{"),
    /JSON の形式が正しくありません/
  );
});
