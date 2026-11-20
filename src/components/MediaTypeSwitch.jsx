"use client";

import { discoveryCategories } from "@/lib/config/discovery";
import { useId } from "react";
import * as m from "motion/react-m";
import { snappySpring } from "@/lib/motion";
import {
  MaterialSymbolsGridViewOutlineRounded,
  MaterialSymbolsMovieOutlineRounded,
  MaterialSymbolsTvOutlineRounded,
  MaterialSymbolsSmartphoneOutline,
} from "@/components/icons";

const movieOption = { value: "movie", label: "电影", Icon: MaterialSymbolsMovieOutlineRounded };
const tvOption = { value: "tv", label: "电视剧", Icon: MaterialSymbolsTvOutlineRounded };
const options = [
  { value: "all", label: "全部", Icon: MaterialSymbolsGridViewOutlineRounded },
  movieOption,
  tvOption,
  { value: "short", label: "短剧", Icon: MaterialSymbolsSmartphoneOutline },
];

export function MediaTypeSwitch({ value, onChange, includeAll = false, discovery = false, filmAndTvOnly = false }) {
  const id = useId();
  const displayedOptions = filmAndTvOnly
    ? [movieOption, { ...tvOption, label: "剧集" }]
    : discovery ? discoveryCategories.map((item) => ({ ...item, Icon: options.find((option) => option.value === item.value)?.Icon || MaterialSymbolsTvOutlineRounded })) : options.filter((option) => includeAll || option.value !== "all");
  return (
    <div role="radiogroup" aria-label="内容类型" className="bg-surface-active p-1 rounded-xl inline-flex flex-wrap items-center gap-1 max-w-full">
      {displayedOptions.map(({ value: optionValue, label, Icon }) => (
        <label key={optionValue} className="cursor-pointer relative isolate">
          <input className="peer sr-only" name={`media-type-${id}`} type="radio" value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} />
          {value === optionValue && (
            <m.span layoutId={`media-type-${id}`} aria-hidden="true" className="absolute inset-0 -z-10 rounded-lg bg-surface-light shadow-card" transition={snappySpring} />
          )}
          <span className="media-toggle-btn min-h-11 px-3 sm:px-5 rounded-lg text-sm font-medium text-muted peer-checked:text-ink peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-primary-dark flex items-center gap-1.5 whitespace-nowrap">
            <Icon className={`${includeAll ? "hidden sm:inline " : ""}text-lg`} aria-hidden="true" />{label}
          </span>
        </label>
      ))}
    </div>
  );
}
