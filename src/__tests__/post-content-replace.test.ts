import { countOccurrences, replaceAllInString } from "@/lib/post-content-replace";

describe("post-content-replace", () => {
  it("counts case-sensitive occurrences", () => {
    expect(countOccurrences("foo Foo foo", "foo", true)).toBe(2);
  });

  it("counts case-insensitive occurrences", () => {
    expect(countOccurrences("foo Foo foo", "foo", false)).toBe(3);
  });

  it("replaces literal case-sensitive", () => {
    expect(replaceAllInString("a:b:a", "a", "X", true)).toBe("X:b:X");
  });

  it("replaces case-insensitive with fixed replacement string", () => {
    expect(replaceAllInString("Hello HELLO", "hello", "Hi", false)).toBe("Hi Hi");
  });
});
