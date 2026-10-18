import unittest
import engine


class PlanTests(unittest.TestCase):
    def seg(self, a, b, t):
        return {"start": a, "end": b, "text": t}

    def test_keeps_last_take_of_restated_sentence(self):
        segs = [self.seg(20.8, 23, "يطلع لك فيديو المحتوى"),
                self.seg(23.4, 26, "كل يوم يطلع لك فيديو لصانع محتوى ناجح")]
        keep, dropped = engine.plan_keep(segs)
        self.assertEqual([k["start"] for k in keep], [23.4])
        self.assertEqual(dropped[0]["why"], "retake")

    def test_distinct_sentences_both_kept(self):
        segs = [self.seg(0, 3, "يقولك استمر ونزل وروح تنجح"),
                self.seg(4, 9, "طيب وين الناس اللي نزلت كل يوم واستمرت وما نجحت")]
        keep, dropped = engine.plan_keep(segs)
        self.assertEqual(len(keep), 2)
        self.assertEqual(dropped, [])

    def test_false_start_prefix_is_dropped(self):
        segs = [self.seg(47, 48, "هذي"), self.seg(50, 54, "هذي الفئة ما رح تشوفها لانها في المقبرة")]
        keep, dropped = engine.plan_keep(segs)
        self.assertEqual([k["start"] for k in keep], [50])

    def test_lone_stub_is_a_false_start(self):
        keep, dropped = engine.plan_keep([self.seg(0, 1, "كل")])
        self.assertEqual(keep, [])
        self.assertEqual(dropped[0]["why"], "false-start")

    def test_arabic_normalisation(self):
        self.assertEqual(engine.norm("الفِئَةُ، أَهَّمُ!"), engine.norm("الفئه اهم"))


class SilenceTests(unittest.TestCase):
    def test_levels_to_silences_respects_min_length(self):
        lv = [-20] * 10 + [-40] * 4 + [-20] * 5 + [-40] * 12   # 0.2 s gap, then 0.6 s tail
        self.assertEqual(engine.silences_from_levels(lv, -30, min_len=0.5), [(0.95, 1.55)])

    def test_auto_threshold_sits_above_noise_floor(self):
        lv = [-39] * 30 + [-25] * 70
        th = engine.auto_threshold(lv)
        self.assertTrue(-39 < th < -25)

    def test_invert_leaves_padding_and_covers_tail(self):
        keep = engine.invert([(2.0, 3.0), (5.0, 6.0)], total=8.0, pad=0.1)
        self.assertEqual(keep, [(0.0, 2.1), (2.9, 5.1), (5.9, 8.0)])

    def test_invert_drops_tiny_slivers(self):
        self.assertEqual(engine.invert([(0.0, 1.0)], total=1.05, pad=0.0), [])


if __name__ == "__main__":
    unittest.main()
