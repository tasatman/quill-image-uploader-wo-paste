import LoadingImage from "./blots/image.js";
import "./quill.imageUploader.css";
class ImageUploader {
  constructor(quill, options) {
    this.quill = quill;
    this.options = options;
    this.range = null;

    if (typeof this.options.upload !== "function") {
      console.warn(
        "[Missing config] upload function that returns a promise is required"
      );
    }

    if (this.options.loadingClass) {
      LoadingImage.className = this.options.loadingClass 
    }

    const toolbar = this.quill.getModule("toolbar");
    toolbar.addHandler("image", this.selectLocalImage.bind(this));

    this.handleDrop = this.handleDrop.bind(this);

    this.quill.root.addEventListener("drop", this.handleDrop, false);
  }

  selectLocalImage() {
    this.range = this.quill.getSelection();
    this.fileHolder = document.createElement("input");
    this.fileHolder.setAttribute("type", "file");
    this.fileHolder.setAttribute("accept", "image/*");
    this.fileHolder.setAttribute("style", "visibility:hidden");

    this.fileHolder.onchange = this.fileChanged.bind(this);

    document.body.appendChild(this.fileHolder);

    this.fileHolder.click();

    window.requestAnimationFrame(() => {
      document.body.removeChild(this.fileHolder);
    });
  }

  handleDrop(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    if (
      evt.dataTransfer &&
      evt.dataTransfer.files &&
      evt.dataTransfer.files.length
    ) {
      if (document.caretRangeFromPoint) {
        const selection = document.getSelection();
        const range = document.caretRangeFromPoint(evt.clientX, evt.clientY);
        if (selection && range) {
          selection.setBaseAndExtent(
            range.startContainer,
            range.startOffset,
            range.startContainer,
            range.startOffset
          );
        }
      } else {
        const selection = document.getSelection();
        const range = document.caretPositionFromPoint(evt.clientX, evt.clientY);
        if (selection && range) {
          selection.setBaseAndExtent(
            range.offsetNode,
            range.offset,
            range.offsetNode,
            range.offset
          );
        }
      }

      this.range = this.quill.getSelection();
      const file = evt.dataTransfer.files[0];

      setTimeout(() => {
        this.range = this.quill.getSelection();
        this.readAndUploadFile(file);
      }, 0);
    }
  }

  readAndUploadFile(file) {
    let isUploadReject = false;

    const fileReader = new FileReader();

    fileReader.addEventListener(
      "load",
      () => {
        if (!isUploadReject) {
          const base64ImageSrc = fileReader.result;
          this.insertBase64Image(base64ImageSrc);
        }
      },
      false
    );

    if (file) {
      fileReader.readAsDataURL(file);
    }

    this.options.upload(file).then(
      (imageUrl) => {
        this.insertToEditor(imageUrl);
      },
      (error) => {
        isUploadReject = true;
        this.removeBase64Image();
        console.warn(error);
      }
    );
  }

  fileChanged() {
    const file = this.fileHolder.files[0];
    this.readAndUploadFile(file);
  }

  insertBase64Image(url) {
    const { range } = this;
    this.quill.insertEmbed(
      range.index,
      LoadingImage.blotName,
      `${url}`,
      "user"
    );
  }

  insertToEditor(url) {
    const { range } = this;
    // Delete the placeholder image
    this.quill.deleteText(range.index, 3, "user");
    // Insert the server saved image
    this.quill.insertEmbed(range.index, "image", `${url}`, "user");

    range.index++;
    this.quill.setSelection(range, "user");
  }

  removeBase64Image() {
    const { range } = this;
    this.quill.deleteText(range.index, 3, "user");
  }
}

window.ImageUploader = ImageUploader;
export default ImageUploader;
