import os
import argparse
from itertools import product

def generate_wordlist(
    output_path="wordlists/generated_subdomains.txt",
    include_common=True,
    include_env=True,
    custom_keywords=None,
    numeric_range=None,
    numeric_prefix=False,
    pattern=None,
    delimiter="_",
    verbose=True,
):
    """
    Generate a flexible subdomain wordlist.

    Args:
        output_path (str): File to save generated wordlist.
        include_common (bool): Include common subdomains.
        include_env (bool): Include environment-related words.
        custom_keywords (list[str] or None): Additional user keywords.
        numeric_range (tuple(int,int) or None): Range to generate numeric suffixes or prefixes.
        numeric_prefix (bool): If True, add numeric prefixes instead of suffixes.
        pattern (str or None): Pattern with placeholders {word} and/or {num}, e.g. "{word}{num}", "{num}-{word}".
        delimiter (str): Delimiter between words if pattern not used.
        verbose (bool): Show progress info.

    Returns:
        str: Path to generated wordlist file.
    """

    common_subdomains = [
        "www", "mail", "ftp", "smtp", "webmail", "ns1", "ns2", "vpn", "m", "api", "blog"
    ]
    env_subdomains = [
        "dev", "test", "staging", "qa", "uat", "beta", "demo", "sandbox", "prod", "release"
    ]

    wordlist = set()

    # Base words: common + env + custom
    base_words = set()
    if include_common:
        base_words.update(common_subdomains)
    if include_env:
        base_words.update(env_subdomains)
    if custom_keywords:
        if isinstance(custom_keywords, str):
            # comma or space separated string => list
            custom_keywords = [k.strip() for k in custom_keywords.replace(",", " ").split()]
        base_words.update(custom_keywords)

    # If no base words, add a default safe list to avoid empty
    if not base_words:
        base_words.update(["www", "mail", "dev", "test"])

    # Add base words as-is
    wordlist.update(base_words)

    # Add numeric ranges if specified
    if numeric_range:
        start, end = numeric_range
        nums = [str(i) for i in range(start, end + 1)]

        if pattern:
            # Use pattern with placeholders {word}, {num}
            for w, n in product(base_words, nums):
                try:
                    entry = pattern.format(word=w, num=n)
                    wordlist.add(entry)
                except KeyError:
                    if verbose:
                        print("[!] Pattern must contain {word} and/or {num} placeholders.")
                    break
        else:
            # Default numeric prefix/suffix
            for w, n in product(base_words, nums):
                if numeric_prefix:
                    wordlist.add(f"{n}{delimiter}{w}")
                else:
                    wordlist.add(f"{w}{delimiter}{n}")

    # Save output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for entry in sorted(wordlist):
            f.write(entry + "\n")

    if verbose:
        print(f"[+] Generated {len(wordlist)} subdomains saved to: {output_path}")

    return output_path


def cli():
    parser = argparse.ArgumentParser(description="Custom Wordlist Generator for Subdomain Enumeration")
    parser.add_argument("-o", "--output", default="wordlists/generated_subdomains.txt",
                        help="Output file path (default: wordlists/generated_subdomains.txt)")
    parser.add_argument("--no-common", action="store_true", help="Exclude common subdomains")
    parser.add_argument("--no-env", action="store_true", help="Exclude environment subdomains")
    parser.add_argument("-c", "--custom", type=str, default=None,
                        help="Custom keywords (comma or space separated)")
    parser.add_argument("-r", "--range", type=str, default=None,
                        help="Numeric range, e.g. 1-100")
    parser.add_argument("--numeric-prefix", action="store_true",
                        help="Use numeric prefix instead of suffix")
    parser.add_argument("--pattern", type=str, default=None,
                        help="Custom pattern with placeholders {word} and {num}, e.g. '{num}-{word}'")
    parser.add_argument("-d", "--delimiter", type=str, default="_",
                        help="Delimiter between word and number (default: '_')")
    parser.add_argument("-q", "--quiet", action="store_true", help="Quiet mode (no verbose output)")

    args = parser.parse_args()

    numeric_range = None
    if args.range:
        try:
            parts = args.range.split("-")
            if len(parts) == 2:
                numeric_range = (int(parts[0]), int(parts[1]))
            else:
                raise ValueError
        except ValueError:
            print("[!] Invalid range format. Use something like 1-100.")
            return

    generate_wordlist(
        output_path=args.output,
        include_common=not args.no_common,
        include_env=not args.no_env,
        custom_keywords=args.custom,
        numeric_range=numeric_range,
        numeric_prefix=args.numeric_prefix,
        pattern=args.pattern,
        delimiter=args.delimiter,
        verbose=not args.quiet
    )


if __name__ == "__main__":
    cli()
