
import * as faceapi from 'face-api.js';

// @ts-ignore
const MODEL_URL = import.meta.env.BASE_URL + 'models';

let isModelsLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

export const faceRecognitionService = {
    loadModels: async () => {
        if (isModelsLoaded) return;
        if (modelLoadingPromise) return modelLoadingPromise;

        modelLoadingPromise = (async () => {
            try {
                console.log('Loading light face-api models (Tiny Mode)...');
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                isModelsLoaded = true;
                console.log('Face-api models loaded successfully.');
            } catch (error) {
                console.error('Error loading face-api models:', error);
                modelLoadingPromise = null;
                throw error;
            }
        })();

        return modelLoadingPromise;
    },

    extractDescriptor: async (imageInput: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<number[] | null> => {
        try {
            await faceRecognitionService.loadModels();

            if (imageInput instanceof HTMLVideoElement) {
                if (imageInput.paused || imageInput.ended || imageInput.readyState < 2) {
                    return null;
                }
            }

            // Standardized 512px input for best balance with 150px internal recognition crops
            const options = new faceapi.TinyFaceDetectorOptions({
                inputSize: 512,
                scoreThreshold: 0.2
            });

            const detection = await faceapi.detectSingleFace(imageInput, options)
                .withFaceLandmarks(true)
                .withFaceDescriptor();

            if (!detection) return null;

            return Array.from(detection.descriptor);
        } catch (err) {
            console.error("AI Extraction Error:", err);
            return null;
        }
    },

    findBestMatch: (queryDescriptor: number[], members: any[], threshold = 0.5) => {
        if (members.length === 0) return null;

        try {
            const labeledDescriptors = members
                .filter(m => m.faceDescriptor && Array.isArray(m.faceDescriptor))
                .map(m => {
                    return new faceapi.LabeledFaceDescriptors(
                        m.id,
                        [new Float32Array(m.faceDescriptor)]
                    );
                });

            if (labeledDescriptors.length === 0) return null;

            // Stricter FaceMatcher with 0.45 threshold (lower is stricter)
            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
            const bestMatch = faceMatcher.findBestMatch(new Float32Array(queryDescriptor));

            if (!bestMatch || bestMatch.label === 'unknown') return null;

            // Normalize confidence based on the threshold
            // If distance is 0, confidence is 1.0. If distance is threshold, confidence is 0.
            const confidenceScore = Math.max(0, 1 - (bestMatch.distance / threshold));

            return {
                memberId: bestMatch.label,
                distance: bestMatch.distance,
                confidence: confidenceScore
            };
        } catch (err) {
            console.error("FindBestMatch Error:", err);
            return null;
        }
    }
};
