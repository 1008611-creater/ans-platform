import { describe, expect, it } from "vitest";
import { getPublicDisplayName, toPublicAuthor } from "@/lib/public-identity";

describe("公开身份纯函数", () => {
  it.each([null, undefined, "", " \t\n "])("昵称 %j 统一回退匿名，不读取其他身份", nickname => {
    const user = { nickname, name: "真实姓名", email: "private@example.test", username: "email_local_part", githubUsername: "private-github" };
    expect(getPublicDisplayName(user)).toBe("匿名同学");
  });

  it("只修剪 nickname，不改变公开昵称内容", () => {
    expect(getPublicDisplayName({ nickname: "  星河同学  " })).toBe("星河同学");
  });

  it("构造 client 作者白名单，不展开原始对象且不修改输入", () => {
    const input = Object.freeze({
      id: "id", username: "member_01", nickname: "星河", name: "真实姓名", email: "private@example.test",
      githubUsername: "private-github", bio: "私人简介", customLinks: [{ url: "https://private.example.test" }],
      avatar: null, verified: true,
    });
    expect(toPublicAuthor(input)).toEqual({ id: "id", username: "member_01", name: "星河", avatar: null, verified: true });
    expect(input.name).toBe("真实姓名");
  });
});
