import { Badge } from "../ui/badge";

export function ThreadTags({ tags }: { tags?: string[] | null }) {
  return (
    <div className="flex gap-1">
      {tags?.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
