'use client';

import Image from 'next/image';
import styles from './message-thread.module.scss';

export type MessageItem = {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'offer';
};

interface MessageThreadProps {
  messages: MessageItem[];
  currentUserId: string;
  className?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageThread({ messages, currentUserId, className }: MessageThreadProps) {
  return (
    <div className={`${styles.thread}${className ? ` ${className}` : ''}`}>
      {messages.map((message) => {
        const isSent = message.senderId === currentUserId;
        return (
          <div
            key={message.id}
            className={`${styles.row} ${isSent ? styles.sent : styles.received}`}
          >
            {!isSent && (
              <div className={styles.avatar} aria-hidden="true">
                <Image
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.senderId}`}
                  alt=""
                  width={32}
                  height={32}
                  sizes="32px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
            <div className={styles.bubbleGroup}>
              <div className={`${styles.bubble} ${isSent ? styles.bubbleSent : styles.bubbleReceived}`}>
                {message.content}
              </div>
              <time className={styles.timestamp} dateTime={message.timestamp.toISOString()}>
                {formatTime(message.timestamp)}
              </time>
            </div>
            {isSent && (
              <div className={styles.avatar} aria-hidden="true">
                <Image
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.senderId}`}
                  alt=""
                  width={32}
                  height={32}
                  sizes="32px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
