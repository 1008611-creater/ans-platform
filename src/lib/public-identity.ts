interface PublicIdentity {
  nickname?: string | null;
}

export function getPublicDisplayName(user: PublicIdentity): string {
  return user.nickname?.trim() || "匿名同学";
}

export function toPublicAuthor(user: PublicIdentity & {
  id: string;
  username: string;
  avatar: string | null;
  verified: boolean;
}) {
  // 显式白名单，避免原始用户字段随 client props 一起序列化。
  return {
    id: user.id,
    username: user.username,
    name: getPublicDisplayName(user),
    avatar: user.avatar,
    verified: user.verified,
  };
}
