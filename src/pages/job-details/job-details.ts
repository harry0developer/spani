import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ActionSheetController } from 'ionic-angular';
import { DataProvider } from '../../providers/data/data';
import { FeedbackProvider } from '../../providers/feedback/feedback';
import { AuthProvider } from '../../providers/auth/auth';
import { AppliedJob, SharedJob, ViewedJob } from '../../models/job';
import { COLLECTION } from '../../utils/const';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Observable, forkJoin } from 'rxjs';
import { take, map, share } from 'rxjs/operators';

@IonicPage()
@Component({
  selector: 'page-job-details',
  templateUrl: 'job-details.html',
})
export class JobDetailsPage {
  job: any;
  profile: any;

  hasApplied: boolean = false;

  appliedUsers: AppliedJob[] = [];
  viewedUsers: ViewedJob[] = [];
  sharedUsers: SharedJob[] = [];

  myRating: string;
  // viewedJobs: ViewedJob[] = [];
  // sharedJobs: SharedJob[] = [];
  // appliedJobs: AppliedJob[] = [];

  constructor(
    public navCtrl: NavController,
    public actionSheetCtrl: ActionSheetController,
    public dataProvider: DataProvider, public navParams: NavParams,
    private authProvider: AuthProvider,
    private feedbackProvider: FeedbackProvider,
    private socialSharing: SocialSharing,
  ) { }

  ionViewDidLoad() {
    this.feedbackProvider.presentLoading();
    this.profile = this.authProvider.getStoredUser();
    this.job = this.navParams.get('job');

    forkJoin(
      this.dataProvider.getDocumentFromCollection(COLLECTION.appliedJobs, this.job.jid),
      this.dataProvider.getDocumentFromCollection(COLLECTION.viewedJobs, this.job.jid),
      this.dataProvider.getDocumentFromCollection(COLLECTION.sharedJobs, this.job.jid)
    ).subscribe(([appliedJobs, viewedJobs, sharedJobs]) => {
      this.appliedUsers = this.dataProvider.getArrayFromObjectList(appliedJobs.data());
      this.viewedUsers = this.dataProvider.getArrayFromObjectList(viewedJobs.data());
      this.sharedUsers = this.dataProvider.getArrayFromObjectList(sharedJobs.data());
      this.feedbackProvider.dismissLoading();
    }, err => {
      this.feedbackProvider.dismissLoading();
      this.feedbackProvider.presentToast('Oops, something went wrong :(');
    });

    // this.getAllJobsFromBD(this.job.jid).subscribe(([applied, shared, viewed]) => {
    //   console.log(applied, shared, viewed); 
    //   applied.map(app => {
    //     if (app.id === this.job.jid) {
    //       this.appliedUsers.push(app);
    //       console.log(this.appliedUsers);

    //     }
    //   });
    //   viewed.map(v => {
    //     if (v.id === this.job.jid) {
    //       this.viewedUsers.push(v);
    //       console.log(this.viewedUsers);

    //     }
    //   });
    //   shared.map(s => {
    //     if (s.id === this.job.jid) {
    //       this.sharedUsers.push(s);
    //       console.log(this.sharedUsers);

    //     }
    //   });
    // }); 
  }



  getAllJobsFromBD(id: string): Observable<any> {
    return forkJoin(
      this.dataProvider.getAllFromCollection(COLLECTION.appliedJobs).pipe(take(1)),
      this.dataProvider.getAllFromCollection(COLLECTION.sharedJobs).pipe(take(1)),
      this.dataProvider.getAllFromCollection(COLLECTION.viewedJobs).pipe(take(1)),
    );
  }


  getJobPoster() {
    this.feedbackProvider.presentLoading();
    this.dataProvider.getItemById(COLLECTION.users, this.job.uid).subscribe(v => {
      this.job.postedBy = v;
      this.feedbackProvider.dismissLoading();
    }, err => {
      this.feedbackProvider.dismissLoading();
    });
  }

  hasViewedJob(): boolean {
    let hasSeen = false;
    this.viewedUsers.forEach(viewedJob => {
      if (viewedJob.jid === this.job.id && viewedJob.uid === this.profile.uid) {
        hasSeen = true;
      }
    });
    return hasSeen;
  }

  addToViewedJobs() {
    const viewedJob: ViewedJob = {
      uid: this.profile.uid,
      jid: this.job.id,
      rid: this.job.uid,
      date: this.dataProvider.getDateTime()
    }
    this.dataProvider.addNewItem(COLLECTION.viewedJobs, viewedJob).then(() => {
      console.log('Added to views');
    }).catch(err => {
      console.log('Not added to views');
    });
  }

  applyNow(job) {
    this.feedbackProvider.presentLoading();
    const appliedJob: AppliedJob = {
      uid: this.profile.uid,
      jid: job.id,
      rid: job.postedBy.uid,
      date: this.dataProvider.getDateTime()
    }
    this.dataProvider.addNewItem(COLLECTION.appliedJobs, appliedJob).then(() => {
      this.hasApplied = true;
      this.feedbackProvider.dismissLoading();
      this.feedbackProvider.presentToast('You have successfully applied');
    }).catch(err => {
      console.log(err);
      this.feedbackProvider.dismissLoading();
      this.feedbackProvider.presentErrorAlert('Job application', 'Error while applying for a job');
    });
  }

  withdrawApplication(job) {
    this.feedbackProvider.presentLoading();
    this.dataProvider.getCollectionByKeyValuePair(COLLECTION.appliedJobs, 'jid', job.id).subscribe(doc => {
      const deleteJob = doc.filter(dJob => dJob.jid === job.id);
      if (deleteJob[0]) {
        this.dataProvider.removeItem(COLLECTION.appliedJobs, deleteJob[0].id).then(() => {
          this.hasApplied = false;
          this.feedbackProvider.dismissLoading();
          this.feedbackProvider.presentToast('Job application cancelled successfully');
        }).catch(err => {
          console.log(err);
          this.feedbackProvider.dismissLoading();
          this.feedbackProvider.presentErrorAlert('Cancel Application', 'An error occured while cancelling job application');
        });
      }

    });
  }

  getDateFromNow(date: string) {
    return this.dataProvider.getDateTimeMoment(date);
  }

  getUsersViewed() {
    let users = 0;
    this.viewedUsers.forEach(vjob => {
      if (vjob.jid === this.job.id) {
        users++;
      }
    });
    return users;
  }
  getUsersApplied() {
    let users = 0;
    this.appliedUsers.forEach(ajob => {
      if (ajob.jid === this.job.id) {
        users++;
      }
    });
    return users;
  }
  getUsersShared() {
    let users = 0;
    this.sharedUsers.forEach(sjob => {
      if (sjob.jid === this.job.id) {
        users++;
      }
    });
    return users;
  }

  isRecruiter(): boolean {
    return this.authProvider.isRecruiter(this.profile);
  }

  hasUserApplied(): boolean {
    let applied = false;
    this.appliedUsers.forEach(appliedJob => {
      if (appliedJob.uid === this.profile.uid && appliedJob.uid === this.profile.uid && this.profile.uid === appliedJob.uid && this.job.jid === appliedJob.jid) {
        applied = true;
      }
    });
    return applied;
  }

  isJobViewed(): boolean {
    if (this.viewedUsers && this.viewedUsers.length > 0) {
      const v = this.viewedUsers.filter(viewed => viewed.uid === this.profile.uid && viewed.jid === this.job.id);
      return v.length > 0;
    } else {
      return false;
    }
  }

  confirmCancelApplication(job) {
    let actionSheet = this.actionSheetCtrl.create({
      title: 'You are about to cancel job application',
      buttons: [
        {
          text: 'Cancel Application',
          role: 'destructive',
          handler: () => {
            this.withdrawApplication(job);
          }
        },
        {
          text: "Don't Cancel",
          role: 'cancel',
          handler: () => {
          }
        }
      ]
    });
    actionSheet.present();
  }


  viewAppliedUsers() {
    // this.navCtrl.push(ViewUsersPage, { category: 'applied', users: this.appliedUsers });
  }
  viewViewedUsers() {
    // this.navCtrl.push(ViewUsersPage, { category: 'viewed', users: this.viewedUsers });
  }
  viewSharedUsers() {
    // this.navCtrl.push(ViewUsersPage, { category: 'shared', users: this.sharedUsers });
  }

  getSkills(skills) {
    return []; //  skills.split(',');
  }

  countAppliedUsers() {

  }

  addToViewedHelper() {

  }


  editJob(job) {
    // this.navCtrl.push(PostJobPage, { job: job, action: 'edit' });
  }

  shareJobWithFacebook(job) {
    let shared: boolean = false;
    this.socialSharing.shareViaFacebook(job).then(res => {
      console.log('Sharing success :)');

    }).catch(err => {
      console.log('Error shareJobWithFacebook');
    });
    return shared;
  }

  shareJobWithTwitter(job) {
    let shared: boolean = false;
    this.socialSharing.shareViaTwitter(job).then(res => {
      console.log('Sharing success :)');

    }).catch(err => {
      console.log('Error shareJobWithTwitter');
    });
    return shared;
  }

  shareJobWithInstagram(job) {
    let shared: boolean = false;
    this.socialSharing.shareViaInstagram(job, 'img.png').then(res => {
      console.log('Sharing success :)');
    }).catch(err => {
      console.log('Error shareJobWithInstagram');
    });
    return shared;
  }


  addToShareduserssharedUsers(job, platform) {
    this.feedbackProvider.presentLoading();
    const sharedJob: SharedJob = {
      jid: job.jid,
      uid: this.profile.uid,
      rid: this.job.postedBy.uid,
      dateShared: this.dataProvider.getDateTime(),
      platform,
    }
    this.dataProvider.addNewItem(COLLECTION.sharedJobs, sharedJob).then(() => {
      this.feedbackProvider.dismissLoading();
      this.feedbackProvider.presentToast('Job shared successfully');
    }).catch(err => {
      console.log(err);
      this.feedbackProvider.dismissLoading();
      this.feedbackProvider.presentErrorAlert('Job share', 'An error occured while sharing a job');
    });

  }

  deleteJob(job) {

  }

  manageJob(job) {
    const actionSheet = this.actionSheetCtrl.create({
      title: `Manage: ${job.title}`,
      buttons: [
        {
          text: 'Edit Job',
          icon: 'create',
          handler: () => {
            this.editJob(job);
          }
        },
        {
          text: 'Delete Job',
          icon: 'trash',
          handler: () => {
            this.deleteJob(job);
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });
    actionSheet.present();
  }

  presentShareJobActionSheet(job) {
    let actionSheet = this.actionSheetCtrl.create({
      title: 'Share this job',
      buttons: [
        {
          text: 'Facebook',
          icon: 'logo-facebook',
          handler: () => {
            console.log('job shared...');

            //this.events.publish(EVENTS.facebookShare);
          }
        },
        {
          text: 'Twitter',
          icon: 'logo-twitter',
          handler: () => {
            console.log('job shared...');

            //this.events.publish(EVENTS.twitterShare);
          }
        },
        {
          text: 'Instagram',
          icon: 'logo-instagram',
          handler: () => {
            console.log('job shared...');

            //this.events.publish(EVENTS.instagramShare);
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
          }
        }
      ]
    });
    actionSheet.present();
  }

}
