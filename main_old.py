# # main.py
# import argparse
# import os
# from datetime import datetime
# from passive_enum import passive_enum  # uses your multi-source version
# from stream_output import stream_print

# # Ensure history directory exists
# os.makedirs("history", exist_ok=True)

# def save_results(domain, subdomains):
#     """Save subdomains to history folder with timestamp."""
#     timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
#     filename = f"history/{domain}_{timestamp}.txt"
#     with open(filename, "w") as f:
#         for sub in subdomains:
#             f.write(sub + "\n")
#     return filename

# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(description="Subdomain Enumeration Tool")
#     parser.add_argument("-d", "--domain", required=True, help="Target domain")
#     args = parser.parse_args()

#     stream_print(f"[*] Starting passive enumeration for {args.domain}...\n")

#     subdomains = passive_enum(args.domain)  # YOUR multi-source function

#     stream_print(f"[+] Found {len(subdomains)} unique subdomains:\n")
#     for sub in subdomains:
#         stream_print(f" - {sub}")

#     file_path = save_results(args.domain, subdomains)
#     stream_print(f"\n[✓] Results saved to {file_path}")





# ---------------2------------------#

# import argparse
# import os
# from datetime import datetime
# from passive_enum import passive_enum  # Your multi-source function
# from stream_output import stream_print

# # Colors
# GREEN = "\033[92m"
# CYAN = "\033[96m"
# YELLOW = "\033[93m"
# RESET = "\033[0m"

# # Ensure history directory exists
# os.makedirs("history", exist_ok=True)

# def save_results(domain, subdomains):
#     """Save subdomains to history folder with timestamp."""
#     timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
#     filename = f"history/{domain}_{timestamp}.txt"
#     with open(filename, "w") as f:
#         for sub in subdomains:
#             f.write(sub + "\n")
#     return filename

# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(description="Subdomain Enumeration Tool")
#     parser.add_argument("-d", "--domain", required=True, help="Target domain")
#     args = parser.parse_args()

#     stream_print(f"{CYAN}[*] Starting passive enumeration for {args.domain}...{RESET}\n")

#     subdomains = passive_enum(args.domain)  # Multi-source function

#     stream_print(f"{GREEN}[+] Found {len(subdomains)} unique subdomains:{RESET}\n")
#     for sub in subdomains:
#         stream_print(f"{YELLOW} - {sub}{RESET}")

#     file_path = save_results(args.domain, subdomains)
#     stream_print(f"\n{GREEN}[✓] Results saved to {file_path}{RESET}")

# ---------------3------------------#

# import argparse
# import os
# from datetime import datetime
# from passive_enum import passive_enum
# from stream_output import stream_print

# # Ensure history folder exists
# os.makedirs("history", exist_ok=True)

# def save_results(domain, subdomains):
#     """Save subdomains to history folder with timestamp."""
#     timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
#     filename = f"history/{domain}_{timestamp}.txt"
#     with open(filename, "w") as f:
#         for sub in subdomains:
#             f.write(sub + "\n")
#     return filename

# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(description="Subdomain Enumeration Tool")
#     parser.add_argument("-d", "--domain", required=True, help="Target domain")
#     args = parser.parse_args()

#     stream_print(f"[*] Starting passive enumeration for {args.domain}...", "info")

#     subdomains = passive_enum(args.domain)

#     stream_print(f"[+] Found {len(subdomains)} unique subdomains:", "success")
#     for sub in subdomains:
#         stream_print(f" - {sub}", "highlight")

#     file_path = save_results(args.domain, subdomains)
#     stream_print(f"[✓] Results saved to {file_path}", "success")


# ---------------4------------------#

import argparse
import os
from datetime import datetime
from passive_enum import passive_enum
from active_enum import active_enum
from stream_output import stream_print

# Ensure history folder exists
os.makedirs("history", exist_ok=True)

def save_results(domain, subdomains):
    """Save subdomains to history folder with timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"history/{domain}_{timestamp}.txt"
    with open(filename, "w") as f:
        for sub in subdomains:
            f.write(sub + "\n")
    return filename

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Subdomain Enumeration Tool")
    parser.add_argument("-d", "--domain", help="Target domain")
    parser.add_argument("-w", "--wordlist", help="Wordlist path (required for active)")
    args = parser.parse_args()

    # Ask for domain if not given
    if not args.domain:
        args.domain = input("Enter target domain: ").strip()

    print("\nChoose enumeration mode:")
    print("1) Passive Enumeration")
    print("2) Active Enumeration")
    print("3) Both")
    choice = input("Enter choice (1/2/3): ").strip()

    all_results = []

    if choice == "1":
        stream_print(f"[*] Starting passive enumeration for {args.domain}...", "info")
        passive_results = passive_enum(args.domain)
        stream_print(f"[+] Passive found {len(passive_results)} unique subdomains", "success")
        all_results.extend(passive_results)

    elif choice == "2":
        if not args.wordlist:
            args.wordlist = input("Enter path to wordlist: ").strip()
        stream_print(f"[*] Starting active enumeration for {args.domain}...", "info")
        active_results = active_enum(args.domain, args.wordlist)
        stream_print(f"[+] Active found {len(active_results)} unique subdomains", "success")
        all_results.extend(active_results)

    elif choice == "3":
        if not args.wordlist:
            args.wordlist = input("Enter path to wordlist: ").strip()

        stream_print(f"[*] Starting passive enumeration for {args.domain}...", "info")
        passive_results = passive_enum(args.domain)
        stream_print(f"[+] Passive found {len(passive_results)} unique subdomains", "success")
        all_results.extend(passive_results)

        stream_print(f"[*] Starting active enumeration for {args.domain}...", "info")
        active_results = active_enum(args.domain, args.wordlist)
        stream_print(f"[+] Active found {len(active_results)} unique subdomains", "success")
        all_results.extend(active_results)

    else:
        print("[!] Invalid choice")
        exit(1)

    # Deduplicate
    all_results = sorted(set(all_results))

    stream_print(f"[✓] Total unique subdomains found: {len(all_results)}", "success")
    for sub in all_results:
        stream_print(f" - {sub}", "highlight")

    file_path = save_results(args.domain, all_results)
    stream_print(f"[✓] Results saved to {file_path}", "success")

