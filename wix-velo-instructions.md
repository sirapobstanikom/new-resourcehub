
# Wix Backend Setup Instructions

1. **Create Collection:**
   - Go to Wix CMS.
   - Create a new collection named `CommunityFeed`.
   - Add the following fields:
     - `name` (Text)
     - `text` (Text)
     - `avatar` (Text)
     - `parentId` (Text)
     - `timestamp` (Date)

2. **Add Backend Code:**
   - In Wix Editor, go to `Backend` > `Expose API`.
   - Create a file named `http-functions.js`.
   - Paste the code provided in the conversational response.

3. **Set Permissions:**
   - Set the `CommunityFeed` collection permissions to:
     - Read: Anyone
     - Create: Anyone
     - Update: Admin
     - Delete: Admin

4. **Update React Code:**
   - Open `components/CommentSection.tsx`.
   - Update the `WIX_API_URL` constant with your site's domain.
