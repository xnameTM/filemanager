//
//  MemoryController.swift
//  memory
//
//  Created by Marek Kotarba on 06/12/2023.
//

import UIKit

struct Translate {
    var x: Int
    var y: Int
}

struct MemoryButton {
    var source: UIButtonss
    var correct: Bool
}

let imgNames = [
    "Cabbage-icon-32",
    "Carrot-icon-32",
    "Cauliflower-icon-32",
    "Chinese-Cabbage-icon-32",
    "Corn-icon-32",
    "Cucumber-icon-32",
    "Eggplant-icon-32",
    "Garlic-icon-32",
    "Ginger-icon-32",
    "Green-Onion-icon-32",
    "Green-Paper-icon-32",
    "Japanese-Radish-icon-32",
    "Leaf-Lettuce-icon-32",
    "Lettuce-icon-32",
    "Red-Onion-icon-32",
    "Snowpea-icon-32",
    "Sweet-Potato-icon-32"
]

class MemoryController: UIViewController {
    var arrangement = Translate(x: 0, y: 0)
    var lvl = ""
    let gap = 40
    var btns: [[MemoryButton]] = []
    var fruits: [String] = []
    var numOfCorrect: Int = 0
    var lastClickedBtn: Optional<UIButton> = nil
    var round: Int = 0
    @IBOutlet var safeAreaView: UIView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        let x = (lvl == "easy" ? 3 : 4)
        let y = (lvl == "easy" ? 4 : 7)
        fruits = (imgNames[0...(x * y / 2 - 1)] + imgNames[0...(x * y / 2 - 1)]).shuffled()
        print(fruits)
        let width = Int(safeAreaView.frame.width)
        let height = Int(safeAreaView.frame.height)
        arrangement = Translate(x: x, y: y)
        
        for i in 0..<arrangement.x {
            var arr: [MemoryButton] = []
            for j in 0..<arrangement.y {
                let btn = UIButton()
                btn.setBackgroundImage(UIImage(named: "none"), for: .normal)
                btn.tag = i * arrangement.y + j
                
                arr.append(MemoryButton(source: btn, correct: false))
                safeAreaView.addSubview(btn)
            }
            btns.append(arr)
        }
        
        calcDistances(width, height, arrangement)
    }
    
    @objc func jazda(sender: UIButton) {
        if (lastClickedBtn == sender) {
            return
        }
        
        let none = UIImage(named: "none")
        var countOfCorrect = 0
        var countOfNotNone = 0
        
        for i in 0..<arrangement.x {
            for j in 0..<arrangement.y {
                if (btns[i][j].source.isEqual(sender) != false && btns[i][j].correct == true) {
                    return
                }
                
                if (btns[i][j].source.backgroundImage(for: .normal)?.isEqual(none) != true) {
                    countOfNotNone += 1
                }
                
                if (btns[i][j].correct == true) {
                    countOfCorrect += 1
                }
            }
        }
        
        if (countOfNotNone - countOfCorrect > 1) {
            return
        }
        
        sender.setBackgroundImage(UIImage(named: fruits[sender.tag]), for: UIControl.State.normal)
        
        if (lastClickedBtn != nil) {
            round += 1
            if (lastClickedBtn?.backgroundImage(for: .normal)?.isEqual(sender.backgroundImage(for: .normal)) == true) {
                
                for i in 0..<arrangement.x {
                    for j in 0..<arrangement.y {
                        if (btns[i][j].source.isEqual(lastClickedBtn) != false || btns[i][j].source.isEqual(sender) != false) {
                            btns[i][j].correct = true
                        }
                    }
                }
                lastClickedBtn = nil
            } else {
                lastClickedBtn = nil
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    for i in 0..<self.arrangement.x {
                        for j in 0..<self.arrangement.y {
                            if (self.btns[i][j].correct == false) {
                                self.btns[i][j].source.setBackgroundImage(UIImage(named: "none"), for: .normal)
                            }
                        }
                    }
                }
            }
            
            if (btns.flatMap{$0}.filter{$0.correct}.count == btns.flatMap{$0}.count) {
                let backAction = UIAlertAction(title: "Back", style: .destructive) { (action) in
                    self.navigationController?.popViewController(animated: true)
                }
                
                let alert = UIAlertController(title: "You won!", message: "Rounds: \(round)", preferredStyle: .alert)
                
                alert.addAction(backAction)
                
                self.present(alert, animated: true)
                
                return
            }
        } else {
            lastClickedBtn = sender
        } 
    }
    
    func calcDistances(_ width: Int, _ height: Int, _ arrangement: Translate) {
        let isVertical: Bool = height > width
        
        if (isVertical) {
            let squareWidth = min((width - (gap * (arrangement.x + 1))) / arrangement.x, (height - (gap * (arrangement.y + 1))) / arrangement.y)
            
            let freeSpace = Translate(x: width - (gap * (arrangement.x + 1) + squareWidth * arrangement.x), y: height - (gap * (arrangement.y + 1) + squareWidth * arrangement.y))
            
            
            for i in 0..<arrangement.x {
                for j in 0..<arrangement.y {
                    let top = (freeSpace.y / 2) + gap + (j * (gap + squareWidth))
                    let left = (freeSpace.x / 2) + gap + (i * (gap + squareWidth))
                    let btn = btns[i][j]
                    btn.source.frame = CGRect(x: left, y: top, width: squareWidth, height: squareWidth)
                    btn.source.addTarget(self, action: #selector(jazda), for: UIControl.Event.touchUpInside)
                }
            }
        } else {
            let squareWidth = min((width - (gap * (arrangement.y + 1))) / arrangement.y, (height - (gap * (arrangement.x + 1))) / arrangement.x)
            
            let freeSpace = Translate(x: width - (gap * (arrangement.y + 1) + squareWidth * arrangement.y), y: height - (gap * (arrangement.x + 1) + squareWidth * arrangement.x))
            
            
            for i in 0..<arrangement.x {
                for j in 0..<arrangement.y {
                    let top = (freeSpace.x / 2) + gap + (j * (gap + squareWidth))
                    let left = (freeSpace.y / 2) + gap + (i * (gap + squareWidth))
                    let btn = btns[i][j]
                    btn.source.frame = CGRect(x: top, y: left, width: squareWidth, height: squareWidth)
                    btn.source.addTarget(self, action: #selector(jazda), for: UIControl.Event.touchUpInside)
                }
            }
        }
    }
    
    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
//        for i in 0..<arrangement.x {
//            for j in 0..<arrangement.y {
//                btns[i][j].source.frame = CGRect(x: btns[i][j].source.frame.origin.y, y: btns[i][j].source.frame.origin.x, width: btns[i][j].source.frame.height, height: btns[i][j].source.frame.width)
//            }
//        }
        calcDistances(Int(safeAreaView.frame.height), Int(safeAreaView.frame.width), arrangement)
    }

    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */

}
// test
// test
// jezu