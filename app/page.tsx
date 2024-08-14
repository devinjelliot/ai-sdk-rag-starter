"use client";

import { useChat } from "ai/react";
import { useRef, useState } from "react";

type Attachment = {
  name: string;
  contentType: string;
  content: string;
  url: string;
};

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    maxToolRoundtrips: 2,
    api: "/api/chat",
  });

  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files) {
      console.log("Files being sent:", files);
    }

    const attachments: Attachment[] | undefined = files
      ? await Promise.all(
          Array.from(files).map(async (file) => {
            const content = await fileToBase64(file);
            return {
              name: file.name,
              contentType: file.type,
              content,
              url: content,
            };
          })
        )
      : undefined;

    handleSubmit(e, { experimental_attachments: attachments });

    // Reset file input
    setFiles(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="whitespace-pre-wrap">
            <div>
              <div className="font-bold">
                {m.role === "user" ? "User: " : "AI: "}
              </div>
              <p>
                {m.content.length > 0 ? (
                  m.content
                ) : (
                  <span className="italic font-light">
                    {"calling tool: " + m?.toolInvocations?.[0].toolName}
                  </span>
                )}
              </p>
              <div>
                {m?.experimental_attachments
                  ?.filter((attachment) =>
                    attachment?.contentType?.startsWith("image/")
                  )
                  .map((attachment, index) => (
                    <img
                      key={`${m.id}-${index}`}
                      src={attachment.url}
                      width={500}
                      alt={attachment.name}
                    />
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form
        className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl space-y-2"
        onSubmit={handleFormSubmit}>
        <input
          type="file"
          className="w-full"
          onChange={(event) => {
            if (event.target.files) {
              setFiles(event.target.files);
            }
          }}
          multiple
          ref={fileInputRef}
        />
        <input
          className="w-full p-2"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
