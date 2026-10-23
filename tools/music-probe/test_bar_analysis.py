import unittest
import numpy as np
from bar_analysis import inspect_bars, waveform_envelope

class BarAnalysisTest(unittest.TestCase):
    def test_variable_tempo_four_beat_bars_keep_their_real_times(self):
        beats=np.array([.3,.8,1.32,1.85,2.4,2.96,3.54,4.14,4.76])
        activations=np.full(300,.95)
        bars=inspect_bars(beats,beats[[0,4,8]],activations,activations,6)
        self.assertEqual([(b['startBeat'],b['endBeat'],b['status'])for b in bars],[(0,4,'candidate'),(4,8,'candidate')])
    def test_wrong_meter_is_flagged_instead_of_dividing_or_inventing_beats(self):
        beats=np.arange(12)*.5+.1;a=np.full(400,.9)
        bars=inspect_bars(beats,beats[[0,3,8,11]],a,a,8)
        self.assertEqual([b['beatsPerBar']for b in bars],[3,5,3])
        self.assertTrue(all('meter-mismatch'in b['issues']for b in bars))
    def test_false_short_beats_and_weak_evidence_are_rejected(self):
        beats=np.array([.1,.6,.7,1.2,2.2,2.7,3.2,3.7,4.2]);a=np.full(300,.9)
        a[round(beats[5]*50)]=.51
        bars=inspect_bars(beats,beats[[0,4,8]],a,np.full(300,.9),5)
        self.assertIn('irregular-beat-spacing',bars[0]['issues'])
        self.assertIn('weak-model-evidence',bars[1]['issues'])
    def test_three_beat_meter_is_checked_without_forcing_four(self):
        beats=np.arange(13)*.5+.1;a=np.full(400,.95)
        bars=inspect_bars(beats,beats[[0,3,6,9,12]],a,a,8,expected_beats_per_bar=3)
        self.assertTrue(all(b['status']=='candidate' and b['beatsPerBar']==3 for b in bars))

    def test_bad_coverage_and_unsorted_beats_fail(self):
        a=np.ones(500)
        with self.assertRaises(ValueError):inspect_bars([.2,.1],[.1,.2],a,a,4)
        with self.assertRaises(ValueError):inspect_bars([.1,4.5],[.1,4.5],a,a,4)
        with self.assertRaises(ValueError):inspect_bars([.1,1],[.1,1],[1],[1],4)
    def test_envelope_preserves_a_transient_and_the_partial_last_window(self):
        y=np.zeros(1001);y[485]=-.75;y[-1]=.5
        result=waveform_envelope(y,1000,100)
        self.assertEqual(result['hopSeconds'],.01)
        self.assertEqual(result['min'][48],-.75)
        self.assertEqual(result['max'][-1],.5)
        self.assertEqual(len(result['max']),101)

if __name__=='__main__':unittest.main()
