# # stream_output.py
# import sys

# def stream_print(text):
#     """Print to stdout without buffering."""
#     sys.stdout.write(text + "\n")
#     sys.stdout.flush()


#----------------------2---------------------#

# import sys
# import time

# def stream_print(text, delay=0.002):
#     """Print text with a small delay for smooth console output."""
#     for char in text:
#         sys.stdout.write(char)
#         sys.stdout.flush()
#         time.sleep(delay)
#     print()

#----------------------3---------------------#

from colorama import Fore, Style, init

# Initialize colorama for cross-platform support
init(autoreset=True)

def stream_print(text, color=None):
    """Instant printing with optional color."""
    colors = {
        "info": Fore.YELLOW,
        "success": Fore.GREEN,
        "error": Fore.RED,
        "highlight": Fore.CYAN
    }
    if color in colors:
        print(colors[color] + text + Style.RESET_ALL)
    else:
        print(text)
