/**
 * Self-hosted TinyMCE bootstrap for the article HTML editor (Vite/ESM).
 * Import this once before rendering <Editor />.
 */
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";

import "tinymce/plugins/lists";
import "tinymce/plugins/advlist";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/table";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/charmap";
import "tinymce/plugins/anchor";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/nonbreaking";
import "tinymce/plugins/emoticons";
import "tinymce/plugins/emoticons/js/emojis.js";

import "tinymce/skins/ui/oxide-dark/skin.js";
import "tinymce/skins/ui/oxide-dark/content.js";
import "tinymce/skins/content/dark/content.js";
