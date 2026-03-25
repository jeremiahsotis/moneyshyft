import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ConnectShyftVoicemailCard from '../ConnectShyftVoicemailCard.vue';

describe('ConnectShyftVoicemailCard', () => {
  it('renders timeline voicemail playback controls and transcript content', () => {
    const wrapper = mount(ConnectShyftVoicemailCard, {
      props: {
        visible: true,
        variant: 'timeline',
        label: 'Voicemail received',
        summary: 'Jordan left a voicemail asking for a callback.',
        direction: 'inbound',
        occurredAtLabel: 'Mar 24, 11:15 AM',
        durationLabel: '47s long',
        recordingUrl: 'https://connectshyft.test/voicemail-1001.mp3',
        transcript: 'Please call me back after lunch.',
      },
    });

    expect(wrapper.text()).toContain('Voicemail received');
    expect(wrapper.text()).toContain('Jordan left a voicemail asking for a callback.');
    expect(wrapper.text()).toContain('Please call me back after lunch.');
    expect(wrapper.get('[data-testid="connectshyft-voicemail-audio"]').attributes('src')).toBe(
      'https://connectshyft.test/voicemail-1001.mp3',
    );
  });

  it('renders calm transcript status copy when the transcript is not ready', () => {
    const wrapper = mount(ConnectShyftVoicemailCard, {
      props: {
        visible: true,
        variant: 'timeline',
        label: 'Voicemail left',
        summary: 'A voicemail was left for follow-up.',
        direction: 'outbound',
        transcriptStatusLabel: 'Transcript is on the way.',
      },
    });

    expect(wrapper.get('[data-testid="connectshyft-voicemail-transcript-status"]').text()).toContain(
      'Transcript is on the way.',
    );
    expect(wrapper.text()).not.toContain('provider');
  });
});
