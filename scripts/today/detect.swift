// The picture checks' eyes (specs/news_001.md §4): Apple's Vision framework,
// on this Mac, no service and no key. For each image path given, prints one
// JSON line: { "path", "words": [{ "text", "confidence" }], "faces": n }.
// picture.mjs compiles this once (swiftc) into node_modules/.cache and reads
// the lines; it decides what fails, this only reports what it saw.
import Foundation
import Vision

struct Word: Encodable { let text: String; let confidence: Float }
struct Seen: Encodable { let path: String; let words: [Word]; let faces: Int; let error: String? }

let out = FileHandle.standardOutput
let encoder = JSONEncoder()

for path in CommandLine.arguments.dropFirst() {
	var seen = Seen(path: path, words: [], faces: 0, error: nil)
	let handler = VNImageRequestHandler(url: URL(fileURLWithPath: path), options: [:])
	let text = VNRecognizeTextRequest()
	text.recognitionLevel = .accurate
	text.usesLanguageCorrection = false
	let faces = VNDetectFaceRectanglesRequest()
	do {
		try handler.perform([text, faces])
		let words = (text.results ?? []).compactMap { $0.topCandidates(1).first }.map { Word(text: $0.string, confidence: $0.confidence) }
		seen = Seen(path: path, words: words, faces: faces.results?.count ?? 0, error: nil)
	} catch {
		seen = Seen(path: path, words: [], faces: 0, error: "\(error)")
	}
	out.write(try! encoder.encode(seen))
	out.write("\n".data(using: .utf8)!)
}
