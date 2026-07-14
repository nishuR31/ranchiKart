import os
import urllib.parse
import secrets

def load_dotenv(dotenv_path):
    env_vars = {}
    if not os.path.exists(dotenv_path):
        return env_vars
    with open(dotenv_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                # Strip quotes if present
                v = v.strip().strip('"').strip("'")
                env_vars[k.strip()] = v
    return env_vars

def main():
    # Find .env file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dotenv_path = os.path.join(current_dir, '../.env')
    if not os.path.exists(dotenv_path):
        dotenv_path = os.path.join(os.getcwd(), '.env')
        if not os.path.exists(dotenv_path):
            dotenv_path = os.path.join(os.getcwd(), 'backend/.env')

    print(f"Loading environment from: {os.path.abspath(dotenv_path)}")
    env = load_dotenv(dotenv_path)

    client_id = env.get("GOOGLE_CLIENT_ID")
    callback_url = env.get("GOOGLE_CALLBACK_URL")
    web_origin = env.get("WEB_ORIGIN", "http://localhost:5173")

    if not client_id or not callback_url:
        print("Error: GOOGLE_CLIENT_ID or GOOGLE_CALLBACK_URL is not configured in .env")
        print(f"Current values:\n  GOOGLE_CLIENT_ID: {client_id}\n  GOOGLE_CALLBACK_URL: {callback_url}")
        return

    # Generate a random state
    state = secrets.token_hex(16)

    # Construct the login URL
    params = {
        "client_id": client_id,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state
    }
    google_login_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

    print("\n" + "="*80)
    print("GOOGLE OAUTH REAL LINK GENERATED")
    print("="*80)
    print(f"\n1. Open the following URL in your browser to log in with Google:\n\n{google_login_url}\n")
    print("2. After successful authentication, Google will redirect you to your Callback URL:")
    print(f"   {callback_url}")
    print("\n3. If you run your server locally and set GOOGLE_CALLBACK_URL to localhost,")
    print("   the browser will redirect to your local server, which will automatically")
    print("   exchange the code for tokens and redirect you back to the frontend at:")
    print(f"   {web_origin}/auth?token=<JWT_ACCESS_TOKEN>")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
