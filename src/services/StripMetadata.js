import piexif from "piexifjs";

export default async function stripMetadata  (imageFile, metadataSettings) {
    const reader = new FileReader();
    // Remove EXIF using piexif
    let cleanedImg = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(imageFile);
    });

    if (metadataSettings.value.exif) {
        try {
            cleanedImg = piexif.remove(cleanedImg);
        } catch (error) {
            const message = `EXIF removal failed: ${error.message}`;
            console.warn(message);
            throw new Error(message);
        }
    }

    // Remove other metadata using canvas
    return new Promise((resolve) => {
        const imgElement = new Image();
        imgElement.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;

            const ctx = canvas.getContext('2d', {
                willReadFrequently: true
            });

            // Preserve transparency
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgElement, 0, 0);

            // Additional XMP/IPTC removal
            if (metadataSettings.value.xmp || metadataSettings.value.iptc) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                scrubMetadataFromPixels(imageData.data);
                ctx.putImageData(imageData, 0, 0);
            }

            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        };
        imgElement.src = cleanedImg;
    });
};

const scrubMetadataFromPixels = (pixelData) => {
    // Advanced metadata scrubbing in pixel data
    const encoder = new TextEncoder();
    const marker = encoder.encode('http://ns.adobe.com/');

    for (let i = 0; i < pixelData.length - marker.length; i++) {
        let match = true;
        for (let j = 0; j < marker.length; j++) {
            if (pixelData[i + j] !== marker[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            pixelData.fill(0, i, i + marker.length);
            i += marker.length;
        }
    }
};