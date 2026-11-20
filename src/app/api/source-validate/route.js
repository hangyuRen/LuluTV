import { validateCatalog } from "@/lib/server/catalog-validation.mjs";

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "请输入有效的视频源地址。" }, { status: 400 }); }

  try {
    return Response.json(await validateCatalog(body?.url, { signal: request.signal }));
  } catch (error) {
    return Response.json({ error: error.status ? error.message : "检测视频源失败，请重试。" }, { status: error.status || 502 });
  }
}
