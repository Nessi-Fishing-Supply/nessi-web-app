/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MessageThread from '../index';
import type { MessageWithSender } from '../index';

const SENDER_ID = 'user-sender';
const RECEIVER_ID = 'user-receiver';

const makeSender = (id: string) => ({
  id,
  first_name: id === SENDER_ID ? 'Alice' : 'Bob',
  last_name: 'Smith',
  avatar_url: null,
});

const baseMessages: MessageWithSender[] = [
  {
    id: 'msg-1',
    thread_id: 'thread-1',
    sender_id: RECEIVER_ID,
    type: 'text',
    content: 'Hey, is this still available?',
    metadata: null,
    is_filtered: false,
    original_content: null,
    edited_at: null,
    created_at: '2025-06-01T10:00:00.000Z',
    sender: makeSender(RECEIVER_ID),
  },
  {
    id: 'msg-2',
    thread_id: 'thread-1',
    sender_id: SENDER_ID,
    type: 'text',
    content: 'Yes, still available!',
    metadata: null,
    is_filtered: false,
    original_content: null,
    edited_at: null,
    created_at: '2025-06-01T10:05:00.000Z',
    sender: makeSender(SENDER_ID),
  },
];

beforeEach(() => {
  cleanup();
});

describe('MessageThread', () => {
  it('renders message content for all messages', () => {
    render(<MessageThread messages={baseMessages} currentUserId={SENDER_ID} />);
    expect(screen.getByText('Hey, is this still available?')).toBeInTheDocument();
    expect(screen.getByText('Yes, still available!')).toBeInTheDocument();
  });

  it('applies sent class to messages from currentUserId', () => {
    const { container } = render(
      <MessageThread messages={baseMessages} currentUserId={SENDER_ID} />,
    );
    const rows = container.querySelectorAll('[class*="row"]');
    // msg-1 is from receiver → received; msg-2 is from sender → sent
    expect(rows[0].className).toMatch(/received/);
    expect(rows[1].className).toMatch(/sent/);
  });

  it('applies received class to messages from other users', () => {
    const { container } = render(
      <MessageThread messages={baseMessages} currentUserId={SENDER_ID} />,
    );
    const rows = container.querySelectorAll('[class*="row"]');
    expect(rows[0].className).toMatch(/received/);
  });

  it('renders timestamps for each message', () => {
    render(<MessageThread messages={baseMessages} currentUserId={SENDER_ID} />);
    const timestamps = screen.getAllByRole('time');
    expect(timestamps).toHaveLength(2);
    expect(timestamps[0]).toHaveAttribute('dateTime', '2025-06-01T10:00:00.000Z');
    expect(timestamps[1]).toHaveAttribute('dateTime', '2025-06-01T10:05:00.000Z');
  });

  it('renders avatar only for received messages, not for sent messages', () => {
    const { container } = render(
      <MessageThread messages={baseMessages} currentUserId={SENDER_ID} />,
    );
    // Only received messages have an avatarWrap div (aria-hidden wrapper)
    const avatarWrappers = container.querySelectorAll('[class*="avatarWrap"]');
    // msg-1 is received (has avatar), msg-2 is sent (no avatar)
    expect(avatarWrappers).toHaveLength(1);
  });

  it('applies optional className to root element', () => {
    const { container } = render(
      <MessageThread messages={baseMessages} currentUserId={SENDER_ID} className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders system messages centered with no bubble', () => {
    const messages: MessageWithSender[] = [
      {
        id: 'msg-sys',
        thread_id: 'thread-1',
        sender_id: SENDER_ID,
        type: 'system',
        content: 'Offer accepted',
        metadata: null,
        is_filtered: false,
        original_content: null,
        edited_at: null,
        created_at: '2025-06-01T11:00:00.000Z',
        sender: makeSender(SENDER_ID),
      },
    ];
    render(<MessageThread messages={messages} currentUserId={SENDER_ID} />);
    const systemEl = screen.getByText('Offer accepted');
    expect(systemEl).toBeInTheDocument();
    // System messages do not render inside a row bubble — no time element
    expect(screen.queryByRole('time')).not.toBeInTheDocument();
  });

  it('renders nudge messages as InlineBanner', () => {
    const messages: MessageWithSender[] = [
      {
        id: 'msg-nudge',
        thread_id: 'thread-1',
        sender_id: SENDER_ID,
        type: 'nudge',
        content: 'Keep your transactions on Nessi for buyer protection.',
        metadata: null,
        is_filtered: false,
        original_content: null,
        edited_at: null,
        created_at: '2025-06-01T11:30:00.000Z',
        sender: makeSender(SENDER_ID),
      },
    ];
    render(<MessageThread messages={messages} currentUserId={SENDER_ID} />);
    expect(
      screen.getByText('Keep your transactions on Nessi for buyer protection.'),
    ).toBeInTheDocument();
    // Nudge messages do not render a time element
    expect(screen.queryByRole('time')).not.toBeInTheDocument();
  });

  it('renders a date separator between messages on different days', () => {
    const messages: MessageWithSender[] = [
      {
        id: 'msg-day1',
        thread_id: 'thread-1',
        sender_id: RECEIVER_ID,
        type: 'text',
        content: 'First day message',
        metadata: null,
        is_filtered: false,
        original_content: null,
        edited_at: null,
        created_at: '2025-06-01T10:00:00.000Z',
        sender: makeSender(RECEIVER_ID),
      },
      {
        id: 'msg-day2',
        thread_id: 'thread-1',
        sender_id: SENDER_ID,
        type: 'text',
        content: 'Second day message',
        metadata: null,
        is_filtered: false,
        original_content: null,
        edited_at: null,
        created_at: '2025-06-02T09:00:00.000Z',
        sender: makeSender(SENDER_ID),
      },
    ];
    const { container } = render(<MessageThread messages={messages} currentUserId={SENDER_ID} />);
    // Two separators: one for each day
    const separators = container.querySelectorAll('[role="separator"]');
    expect(separators).toHaveLength(2);
  });

  it('does not render a date separator between messages on the same day', () => {
    const { container } = render(
      <MessageThread messages={baseMessages} currentUserId={SENDER_ID} />,
    );
    // Both messages are on the same day so only one separator (the first)
    const separators = container.querySelectorAll('[role="separator"]');
    expect(separators).toHaveLength(1);
  });
});
