export const discoveryCategories = [
  { value: "movie", label: "电影", type: "movie" },
  { value: "tv", label: "电视剧", type: "tv" },
  { value: "variety", label: "综艺", type: "tv", tag: "综艺" },
  { value: "documentary", label: "纪录片", type: "tv", tag: "纪录片" },
  { value: "anime", label: "动漫", type: "tv", tag: "日本动画" },
];

export const discoverySorts = [
  { value: "recommend", label: "推荐" },
  { value: "rank", label: "评分最高" },
  { value: "time", label: "最新" },
];

export const defaultTags = {
  movie: ["热门", "最新", "经典", "可播放", "豆瓣高分", "冷门佳片", "华语", "欧美", "韩国", "日本", "动作", "喜剧", "爱情", "科幻", "悬疑", "恐怖", "成长"],
  tv: ["热门", "美剧", "英剧", "韩剧", "日剧", "国产剧", "港剧", "日本动画", "综艺", "纪录片"],
};

export function categoryTags(category, tags) {
  // A fixed upstream tag selects the category; it is not a user-selectable
  // subcategory. Only movie/TV expose the discovered tag list.
  return category.tag || !category.type ? [] : tags;
}
